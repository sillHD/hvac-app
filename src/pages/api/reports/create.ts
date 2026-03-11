import type { NextApiRequest, NextApiResponse } from 'next';

// POST /api/reports/create
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  // TODO: validate and store report
  res.status(200).json({ message: 'create report (placeholder)' });
}
