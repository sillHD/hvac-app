import type { NextApiRequest, NextApiResponse } from 'next';
import { getReport } from '../../../server/services/jobs';
import { verifyToken } from '../../../server/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {
    query: { id },
    headers,
  } = req;
  const token = headers.authorization?.startsWith('Bearer ') ? headers.authorization.replace('Bearer ', '') : null;
  const user = token ? verifyToken(token) : null;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }
  const report = await getReport(id as string);
  if (!report) {
    return res.status(404).json({ error: 'Not found' });
  }
  // optionally redact logs for non-admin
  if (user.role !== 'admin' && user.role !== 'root') {
    report.logs = [];
  }
  return res.status(200).json({ report });
}
