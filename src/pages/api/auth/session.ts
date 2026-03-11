import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../../server/auth';

// GET /api/auth/session
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
  if (!token) {
    return res.status(200).json({ user: null });
  }
  const user = verifyToken(token);
  return res.status(200).json({ user });
}
