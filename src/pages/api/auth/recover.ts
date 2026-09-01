import type { NextApiRequest, NextApiResponse } from 'next';
import { canRecoverPassword } from '../../../server/auth';

// POST /api/auth/recover
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { email } = req.body as { email?: string };
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  // Mock recovery flow for now. We keep the response generic, but for known
  // accounts we return a friendlier message so the internal team understands
  // this is still a prototype until real email delivery is wired up.
  if (await canRecoverPassword(email)) {
    return res.status(200).json({
      ok: true,
      message:
        'Recovery started. In this prototype version, contact the project owner or use the registered internal credentials.',
    });
  }

  return res.status(200).json({
    ok: true,
    message: 'If the email exists in the system, recovery instructions will be sent.',
  });
}