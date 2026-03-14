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

// POST /api/auth/logout
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  return res.status(200).json({ message: 'Sesion cerrada correctamente' });
}
