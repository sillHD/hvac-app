import type { User } from '../auth';

export type AuditAction =
  | 'auth.login.success'
  | 'auth.login.failed'
  | 'auth.login.blocked'
  | 'report.create'
  | 'report.update'
  | 'report.delete'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'customer.create'
  | 'customer.update'
  | 'customer.delete';

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: AuditAction;
  actorEmail?: string;
  actorRole?: User['role'];
  targetType: 'auth' | 'report' | 'user' | 'customer';
  targetId?: string;
  details?: Record<string, unknown>;
}

const auditStore: AuditEvent[] = [];
const AUDIT_LIMIT = 1000;

function nextAuditId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function logAuditEvent(input: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
  const event: AuditEvent = {
    id: nextAuditId(),
    timestamp: new Date().toISOString(),
    ...input,
  };

  auditStore.unshift(event);
  if (auditStore.length > AUDIT_LIMIT) {
    auditStore.length = AUDIT_LIMIT;
  }

  return event;
}

export function listAuditEvents(limit = 200): AuditEvent[] {
  return auditStore.slice(0, Math.max(1, Math.min(limit, AUDIT_LIMIT)));
}
