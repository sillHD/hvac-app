import type { NextApiRequest, NextApiResponse } from 'next';
import { deleteReport, getReport, updateReport } from '../../../server/services/jobs';
import { canEditOrDeleteReports } from '../../../server/auth';
import { withAuth } from '../../../server/middleware/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (req as any).user;
  const id = req.query.id as string;

  if (req.method === 'GET') {
    const report = await getReport(id);
    if (!report) {
      return res.status(404).json({ error: 'Not found' });
    }

    const isOwner = report.createdByEmail
      ? report.createdByEmail === user.email
      : report.technicianName === user.email;
    if (user.role === 'technician' && !isOwner) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (user.role !== 'admin' && user.role !== 'root') {
      report.logs = [];
    }
    return res.status(200).json({ report });
  }

  if (req.method === 'PATCH') {
    if (!canEditOrDeleteReports(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await updateReport(id, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(200).json({ ok: true, report: updated });
  }

  if (req.method === 'DELETE') {
    if (!canEditOrDeleteReports(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await deleteReport(id);
    if (!result.removed) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(200).json({ ok: true, deletedFromSheet: result.deletedFromSheet });
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE');
  return res.status(405).end('Method Not Allowed');
}

export default withAuth(handler);
