/**
 * middleware/permissions.ts — Middlewares de autorización por rol.
 *
 * Se encadenan DESPUÉS de withAuth (que garantiza que req.user existe).
 *
 * Funciones disponibles:
 *
 *  requireRole(role, handler)
 *    — Permite SOLO al rol exacto indicado. Útil para rutas exclusivas de 'root'.
 *    — Ejemplo: export default withAuth(requireRole('root', handler))
 *
 *  requireAnyRole(roles, handler)
 *    — Permite a cualquiera de los roles en el array.
 *    — Ejemplo: export default withAuth(requireAnyRole(['admin', 'root'], handler))
 *
 * Si el usuario no tiene el rol requerido → responde 403 Forbidden.
 */
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import type { User } from '../auth';

/** Permite únicamente al rol exacto especificado */
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

/** Permite a cualquier rol incluido en el array `roles` */
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
