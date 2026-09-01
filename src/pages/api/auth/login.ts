/**
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Body:   { email: string, password: string }
 *
 * Flujo:
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * Responses:
 *  200 — { token: string, user: User } — Login exitoso
 *  400 — Email o password faltante
 *  401 — Credenciales incorrectas
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * Seguridad:
 *  - Rate limiting por email e IP (ver authSecurity.ts)
 * Internal implementation detail.
 * Internal implementation detail.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { signIn } from '../../../server/auth';
import {
  getLoginRateLimitStatus,
  registerLoginFailure,
  registerLoginSuccess,
} from '../../../server/services/authSecurity';
import { logAuditEvent } from '../../../server/services/audit';
import { sendLoginLockoutAlert } from '../../../server/services/securityAlerts';

// POST /api/auth/login
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    sendLoginLockoutAlert({
      email,
      ip,
      blockedSeconds: rate.blockedSeconds,
    }).catch((err) => {
      console.error('[security-alert] failed to send lockout alert email', err);
    });
    return res.status(429).json({ error: `Too many attempts. Retry in ${rate.blockedSeconds}s` });
  }

  const auth = await signIn(email, password);
  if (!auth) {
    registerLoginFailure(rate.emailKey, rate.ipKey);
    const nextRate = getLoginRateLimitStatus(email, ip);
    if (nextRate.blocked) {
      sendLoginLockoutAlert({
        email,
        ip,
        blockedSeconds: nextRate.blockedSeconds,
      }).catch((err) => {
        console.error('[security-alert] failed to send lockout alert email', err);
      });
    }
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
