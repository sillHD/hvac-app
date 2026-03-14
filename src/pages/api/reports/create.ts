/**
 * api/reports/create.ts — Crea un nuevo reporte (invoice o quote).
 *
 * Método: POST
 * Body:   Job (ver src/lib/types/index.ts)
 * Acceso: Cualquier usuario autenticado
 *
 * El endpoint:
 *  - Genera un ID si no se provee
 *  - Asigna createdByEmail con el email del usuario autenticado
 *  - Establece reportType ('invoice' por defecto)
 *  - Para quotes, establece quoteStatus ('pending' por defecto)
 *  - Persiste en memoria y en Google Sheets (si GOOGLE_SHEET_ID está configurado)
 *  - Registra evento de auditoría
 *
 * Respuestas:
 *  200 — { ok: true, report: Job }
 *  400 — Payload faltante
 *  401 — Sin autenticación
 *  405 — Método no permitido
 *  500 — Error al guardar
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Job } from '../../../lib/types';
import { createReport } from '../../../server/services/jobs';
import { withAuth } from '../../../server/middleware/auth';
import { logAuditEvent } from '../../../server/services/audit';

// POST /api/reports/create
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const report = req.body as Job;
  if (!report) {
    return res.status(400).json({ error: 'Missing job payload' });
  }

  // generate an ID if the client didn't provide one
  if (!report.id) {
    report.id = `job${Date.now()}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (req as any).user;
  report.createdByEmail = user.email;

  // ensure completedAt timestamp exists
  if (!report.completedAt) {
    report.completedAt = new Date().toISOString();
  }

  if (!report.reportType) {
    report.reportType = 'invoice';
  }

  if (report.reportType === 'quote' && !report.quoteStatus) {
    report.quoteStatus = 'pending';
  }

  try {
    await createReport(report);
    logAuditEvent({
      action: 'report.create',
      actorEmail: user.email,
      actorRole: user.role,
      targetType: 'report',
      targetId: report.id,
      details: {
        reportType: report.reportType,
        customerName: report.customer?.name,
      },
    });
    res.status(200).json({ ok: true, report });
  } catch (err) {
    console.error('reports/create error', err);
    res.status(500).json({ error: 'could not save report' });
  }
}

export default withAuth(handler);
