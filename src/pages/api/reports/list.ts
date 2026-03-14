import type { NextApiRequest, NextApiResponse } from 'next';
import { listReports } from '../../../server/services/jobs';
import { withAuth } from '../../../server/middleware/auth';

// GET /api/reports/list
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (req as any).user;

  const reports = await listReports(user);
  res.status(200).json({ reports });
}

export default withAuth(handler);
