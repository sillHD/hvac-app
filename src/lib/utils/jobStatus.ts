/**
 * jobStatus.ts — Utilidades para el ciclo de vida de estados de un trabajo.
 *
 * Exporta:
 *  jobStatusOrder  — Array ordenado del flujo de estados (draft → paid)
 *  jobStatusLabels — Etiquetas en español para mostrar en la UI
 *  isFinalStatus() — true si el estado es terminal (no puede avanzar)
 *  canTransition() — Valida si una transición de estado es permitida
 *
 * Flujo normal de un Job:
 *   draft → submitted → processing → invoice_created → completed → partial_paid → paid
 *
 * Estados especiales:
 *   cancelled — Se puede llegar desde cualquier estado no final
 *   error     — Estado de error, puede venir de cualquier punto
 *
 * NOTA: canTransition() solo permite movimientos hacia adelante en jobStatusOrder.
 * Si necesitas permitir regresiones (como de 'completed' a 'processing'),
 * ajusta la lógica en la función directamente.
 */
import { JobStatus } from '../types';

// Ordered list useful for transitions or display
export const jobStatusOrder: JobStatus[] = [
  'draft',
  'submitted',
  'processing',
  'invoice_created',
  'completed',
  'partial_paid',
  'paid',
  'cancelled',
  'error',
];

// friendly labels for UI (not expose raw values)
export const jobStatusLabels: Record<JobStatus, string> = {
  draft: 'Borrador',
  submitted: 'Enviado',
  processing: 'Procesando',
  invoice_created: 'Factura generada',
  completed: 'Completado',
  partial_paid: 'Pago parcial',
  paid: 'Pagado',
  cancelled: 'Cancelado',
  error: 'Error',
};

// Determine if a status represents a final state for audit purposes
export function isFinalStatus(status: JobStatus): boolean {
  return ['completed', 'paid', 'cancelled', 'error'].includes(status);
}

// Transition validation (simple example)
export function canTransition(from: JobStatus, to: JobStatus): boolean {
  const idxFrom = jobStatusOrder.indexOf(from);
  const idxTo = jobStatusOrder.indexOf(to);
  if (idxFrom === -1 || idxTo === -1) return false;
  // allow same or forward movement, but error can be from any
  if (to === 'error') return true;
  return idxTo >= idxFrom;
}
