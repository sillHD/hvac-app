/**
 * Internal implementation detail.
 *
 * Internal implementation detail.
 *
 * Funciones disponibles:
 *
 *  requireRole(role, handler)
 * Internal implementation detail.
 *    — Ejemplo: export default withAuth(requireRole('root', handler))
 *
 *  requireAnyRole(roles, handler)
 * Internal implementation detail.
 *    — Ejemplo: export default withAuth(requireAnyRole(['admin', 'root'], handler))
 *
 * Internal implementation detail.
 */
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import type { User } from '../auth';

/* Internal implementation detail. */
export function requireRole(role: string, handler: NextApiHandler) {
  return (req: NextApiRequest, res: NextApiResponse) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (req as any).user;
    if (!user || user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return handler(req, res);
  };
}

/* Internal implementation detail. */
export function requireAnyRole(roles: User['role'][], handler: NextApiHandler) {
  return (req: NextApiRequest, res: NextApiResponse) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return handler(req, res);
  };
}
