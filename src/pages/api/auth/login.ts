import type { NextApiRequest, NextApiResponse } from 'next';
import { signIn } from '../../../server/auth';

// POST /api/auth/login
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const auth = signIn(email, password);
  if (!auth) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // in a real application we'd set an HttpOnly cookie here
  // res.setHeader('Set-Cookie', `token=${auth.token}; HttpOnly; Path=/;`);

  return res.status(200).json({ token: auth.token, user: auth.user });
}
