/**
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 */
import type { User } from '../auth';

/* Internal implementation detail. */
export type AuditAction =
  | 'auth.login.success'
  | 'auth.login.failed'
  | 'auth.login.blocked'
  | 'auth.logout.global'
  | 'report.create'
  | 'report.update'
  | 'report.delete'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'customer.create'
  | 'customer.update'
  | 'customer.delete';

/* Internal implementation detail. */
export interface AuditEvent {
  id: string;                          // Automatically generated unique ID.
  timestamp: string;                   // ISO 8601
  action: AuditAction;                 // What happened.
  actorEmail?: string;                 // Actor (undefined = system).
  actorRole?: User['role'];            // Actor role.
  targetType: 'auth' | 'report' | 'user' | 'customer'; // Entidad afectada
  targetId?: string;                   // ID de la entidad afectada
  details?: Record<string, unknown>;   // Additional action-specific data.
}

/* Internal implementation detail. */
const auditStore: AuditEvent[] = [];

/* Internal implementation detail. */
const AUDIT_LIMIT = 1000;

/* Internal implementation detail. */
function nextAuditId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 */
export function logAuditEvent(input: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
  const event: AuditEvent = {
    id: nextAuditId(),
    timestamp: new Date().toISOString(),
    ...input,
  };

  auditStore.unshift(event); // Insert first to preserve LIFO order.
  if (auditStore.length > AUDIT_LIMIT) {
    auditStore.length = AUDIT_LIMIT; // Trim to the maximum limit.
  }

  return event;
}

/**
 * Internal implementation detail.
 * Internal implementation detail.
 */
export function listAuditEvents(limit = 200): AuditEvent[] {
  return auditStore.slice(0, Math.max(1, Math.min(limit, AUDIT_LIMIT)));
}
