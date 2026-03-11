import type { NextApiRequest, NextApiResponse } from 'next';
import { listReports } from '../../../server/services/jobs';
import { verifyToken } from '../../../server/auth';

// GET /api/reports/list
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
  const user = token ? verifyToken(token) : null;

  const reports = await listReports(user?.email);
  res.status(200).json({ reports });
}
