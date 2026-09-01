/**
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Header: Authorization: Bearer <token>
 *
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * Responses:
 * Internal implementation detail.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../../server/auth';

// GET /api/auth/session
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
  if (!token) {
    return res.status(200).json({ user: null });
  }
  const user = await verifyToken(token);
  return res.status(200).json({ user });
}
