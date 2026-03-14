/**
 * api/reports/list.ts — Lista los reportes según el rol del usuario.
 *
 * Método: GET
 * Acceso: Cualquier usuario autenticado
 *
 * Comportamiento según rol:
 *  - admin/root: ve todos los reportes
 *  - technician: solo ve reportes propios (por createdByEmail o technicianName)
 *
 * Respuestas:
 *  200 — { reports: Job[] }
 *  401 — Sin autenticación
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { listReports } from '../../../server/services/jobs';
import { withAuth } from '../../../server/middleware/auth';

// GET /api/reports/list
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (req as any).user;

  const reports = await listReports(user);
  res.status(200).json({ reports });
}

export default withAuth(handler);
