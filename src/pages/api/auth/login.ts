import type { NextApiRequest, NextApiResponse } from 'next';
import { signIn } from '../../../server/auth';
import {
  getLoginRateLimitStatus,
  registerLoginFailure,
  registerLoginSuccess,
} from '../../../server/services/authSecurity';
import { logAuditEvent } from '../../../server/services/audit';

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

  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';
  const rate = getLoginRateLimitStatus(email, ip);
  if (rate.blocked) {
    logAuditEvent({
      action: 'auth.login.blocked',
      targetType: 'auth',
      details: { email, ip, blockedSeconds: rate.blockedSeconds },
    });
    return res.status(429).json({ error: `Too many attempts. Retry in ${rate.blockedSeconds}s` });
  }

  const auth = signIn(email, password);
  if (!auth) {
    registerLoginFailure(rate.emailKey, rate.ipKey);
    logAuditEvent({
      action: 'auth.login.failed',
      targetType: 'auth',
      details: { email, ip },
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  registerLoginSuccess(rate.emailKey, rate.ipKey);
  logAuditEvent({
    action: 'auth.login.success',
    actorEmail: auth.user.email,
    actorRole: auth.user.role,
    targetType: 'auth',
    targetId: auth.user.id,
    details: { ip },
  });

  // in a real application we'd set an HttpOnly cookie here
  // res.setHeader('Set-Cookie', `token=${auth.token}; HttpOnly; Path=/;`);

  return res.status(200).json({ token: auth.token, user: auth.user });
}
