import type { NextApiRequest, NextApiResponse } from 'next';

// POST /api/auth/logout
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // TODO: clear session/cookie
  res.status(200).json({ message: 'logout endpoint (placeholder)' });
}
