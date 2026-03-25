/**
 * api/auth/session.ts — Verifica si el token actual sigue siendo válido.
 *
 * Método: GET
 * Header: Authorization: Bearer <token>
 *
 * Usado por useAuth() al cargar la app para restaurar la sesión del usuario.
 * Si el token expiró (TTL 12h) o el usuario fue desactivado, devuelve { user: null }.
 *
 * Respuestas:
 *  200 — { user: User } si token válido, { user: null } si inválido/ausente
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../../server/auth';

// GET /api/auth/session
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
  if (!token) {
    return res.status(200).json({ user: null });
  }
  const user = await verifyToken(token);
  return res.status(200).json({ user });
}
