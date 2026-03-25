/**
 * api/auth/logout.ts — Endpoint de cierre de sesión.
 *
 * Método: POST
 *
 * Actualmente el token vive solo en localStorage del cliente.
 * Este endpoint existe para que el cliente lo llame antes de borrar el token,
 * permitiendo futuras implementaciones de invalidación de sesión en servidor
 * (lista negra de tokens, sesiones en BD, etc.).
 *
 * Respuestas:
 *  200 — { message: 'Sesion cerrada correctamente' }
 *  405 — Método no permitido
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { invalidateUserSessions, type User } from '../../../server/auth';
import { withAuth } from '../../../server/middleware/auth';
import { logAuditEvent } from '../../../server/services/audit';

// POST /api/auth/logout
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (req as any).user as User;
  await invalidateUserSessions(user.id);
  logAuditEvent({
    action: 'auth.logout.global',
    actorEmail: user.email,
    actorRole: user.role,
    targetType: 'auth',
    targetId: user.id,
  });

  return res.status(200).json({ message: 'Sesion cerrada correctamente' });
}

export default withAuth(handler);
