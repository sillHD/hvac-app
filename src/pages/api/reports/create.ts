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
import { listManagedUsers, type User } from '../../../server/auth';
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
  const user = (req as any).user as User;
  report.createdByEmail = user.email;

  const technicians = (await listManagedUsers()).filter((candidate) => candidate.role === 'technician' && !candidate.disabled);

  if (user.role === 'technician') {
    // Technicians can only create reports assigned to themselves.
    report.technicianId = user.id;
    report.technicianName = user.name || user.email;
  } else {
    let selectedTechnician = null;

    if (report.technicianId) {
      selectedTechnician = technicians.find((tech) => tech.id === report.technicianId) || null;
    } else if (report.technicianName) {
      const requested = report.technicianName.trim().toLowerCase();
      selectedTechnician =
        technicians.find((tech) => tech.name?.trim().toLowerCase() === requested) ||
        technicians.find((tech) => tech.email.trim().toLowerCase() === requested) ||
        null;
    }

    if (!selectedTechnician) {
      return res.status(400).json({ error: 'Invalid technician selection' });
    }

    report.technicianId = selectedTechnician.id;
    report.technicianName = selectedTechnician.name || selectedTechnician.email;
  }

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
