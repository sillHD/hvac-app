/**
 * middleware/auth.ts — Middleware de autenticación para rutas API.
 *
 * Uso:
 *   export default withAuth(handler)
 *
 * Comportamiento:
 *  - Lee el token del header `Authorization: Bearer <token>`
 *  - Verifica el token con verifyToken() de server/auth.ts
 *  - Si el token es válido, adjunta el usuario a `req.user` y pasa al handler
 *  - Si no hay token o es inválido/expirado → responde 401 Unauthorized
 *
 * NOTA: req.user se adjunta con `(req as any).user` porque Next.js no permite
 * extender el tipo de NextApiRequest directamente sin modificar los tipos globales.
 * En producción, considera usar augmentación de módulo de TypeScript.
 */
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../auth';

/** Envuelve un handler de API exigiendo autenticación válida */
export function withAuth(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = token ? await verifyToken(token) : null;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // attach user to request for downstream handlers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).user = user;
    return handler(req, res);
  };
}
