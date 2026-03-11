import type { NextApiRequest, NextApiResponse } from 'next';

// GET /api/logs
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // TODO: secure endpoint and return application logs
  res.status(200).json({ logs: [] });
}
