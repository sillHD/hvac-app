import type { NextApiRequest, NextApiResponse } from 'next';

// GET /api/reports/list
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // TODO: fetch reports for user/team
  res.status(200).json({ reports: [] });
}
