import type { NextApiRequest, NextApiResponse } from 'next';
import { deleteReport, getReport, updateReport } from '../../../server/services/jobs';
import { canEditOrDeleteReports, canTechnicianEditOwnReports } from '../../../server/auth';
import { withAuth } from '../../../server/middleware/auth';
import { logAuditEvent } from '../../../server/services/audit';

function isOwnerReport(report: { createdByEmail?: string; technicianName?: string }, userEmail: string): boolean {
  if (report.createdByEmail) return report.createdByEmail === userEmail;
  return report.technicianName === userEmail;
}

function canTechnicianMutateReportStatus(status: string | undefined): boolean {
  return status === 'draft' || status === 'submitted' || status === 'processing';
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (req as any).user;
  const id = req.query.id as string;

  if (req.method === 'GET') {
    const report = await getReport(id);
    if (!report) {
      return res.status(404).json({ error: 'Not found' });
    }

    const isOwner = isOwnerReport(report, user.email);
    if (user.role === 'technician' && !isOwner) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (user.role !== 'admin' && user.role !== 'root') {
      report.logs = [];
    }
    return res.status(200).json({ report });
  }

  if (req.method === 'PATCH') {
    const current = await getReport(id);
    if (!current) {
      return res.status(404).json({ error: 'Not found' });
    }

    const isOwner = isOwnerReport(current, user.email);
    const canMutateAsTechnician =
      canTechnicianEditOwnReports(user.role) &&
      isOwner &&
      canTechnicianMutateReportStatus(current.status);

    if (!canEditOrDeleteReports(user.role) && !canMutateAsTechnician) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await updateReport(id, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: 'Not found' });
    }

    logAuditEvent({
      action: 'report.update',
      actorEmail: user.email,
      actorRole: user.role,
      targetType: 'report',
      targetId: id,
      details: { patchKeys: Object.keys(req.body || {}) },
    });
    return res.status(200).json({ ok: true, report: updated });
  }

  if (req.method === 'DELETE') {
    const current = await getReport(id);
    if (!current) {
      return res.status(404).json({ error: 'Not found' });
    }

    const isOwner = isOwnerReport(current, user.email);
    const canMutateAsTechnician =
      canTechnicianEditOwnReports(user.role) &&
      isOwner &&
      canTechnicianMutateReportStatus(current.status);

    if (!canEditOrDeleteReports(user.role) && !canMutateAsTechnician) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await deleteReport(id);
    if (!result.removed) {
      return res.status(404).json({ error: 'Not found' });
    }

    logAuditEvent({
      action: 'report.delete',
      actorEmail: user.email,
      actorRole: user.role,
      targetType: 'report',
      targetId: id,
      details: { deletedFromSheet: result.deletedFromSheet },
    });
    return res.status(200).json({ ok: true, deletedFromSheet: result.deletedFromSheet });
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE');
  return res.status(405).end('Method Not Allowed');
}

export default withAuth(handler);
