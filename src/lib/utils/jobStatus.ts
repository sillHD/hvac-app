/**
 * Job status lifecycle utilities.
 *
 * Exports:
 *  jobStatusOrder  — Ordered status-flow array (draft → paid)
 *  jobStatusLabels — English labels for display in the UI
 *  isFinalStatus() — Whether a status is terminal
 *  canTransition() — Whether a status transition is permitted
 *
 * Standard job flow:
 *   draft → submitted → processing → invoice_created → completed → partial_paid → paid
 *
 * Special statuses:
 *   cancelled — Can be reached from any non-final status
 *   error     — Can occur at any point
 *
 * canTransition() permits only forward transitions in jobStatusOrder.
 * Adjust the function directly if transitions such as completed to processing
 * must be supported.
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
  draft: 'Draft',
  submitted: 'Submitted',
  processing: 'Processing',
  invoice_created: 'Invoice created',
  completed: 'Completed',
  partial_paid: 'Partial payment',
  paid: 'Paid',
  cancelled: 'Cancelled',
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
