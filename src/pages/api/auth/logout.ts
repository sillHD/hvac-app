import type { NextApiRequest, NextApiResponse } from 'next';

// POST /api/auth/logout
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  return res.status(200).json({ message: 'Sesion cerrada correctamente' });
}
