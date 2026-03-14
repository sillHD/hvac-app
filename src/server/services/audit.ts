/**
 * audit.ts — Sistema de trazabilidad / auditoría de eventos.
 *
 * Registra en memoria todas las acciones relevantes de la aplicación:
 *   - Intentos de login (éxito, fallo, bloqueo)
 *   - Creación/edición/eliminación de reportes
 *   - Creación/edición/eliminación de usuarios
 *   - Creación/edición/eliminación de clientes
 *
 * Límite: se mantienen los últimos AUDIT_LIMIT=1000 eventos (LIFO).
 * Los eventos se pierden al reiniciar el servidor (store en memoria).
 *
 * Para persistencia real en el futuro:
 *   - Reemplazar `auditStore` con llamadas a una base de datos (PostgreSQL, Firestore, etc.)
 *   - O exportar los eventos a Google Sheets usando el servicio googleSheets.ts
 *
 * API pública:
 *   logAuditEvent(input)   — Registra un nuevo evento
 *   listAuditEvents(limit) — Devuelve los N más recientes (máx 1000)
 */
import type { User } from '../auth';

/** Tipos de acciones auditables en el sistema */
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

/** Estructura de un evento de auditoría */
export interface AuditEvent {
  id: string;                          // ID único generado automáticamente
  timestamp: string;                   // ISO 8601
  action: AuditAction;                 // Qué ocurrió
  actorEmail?: string;                 // Quién lo hizo (undefined = sistema)
  actorRole?: User['role'];            // Rol del actor
  targetType: 'auth' | 'report' | 'user' | 'customer'; // Entidad afectada
  targetId?: string;                   // ID de la entidad afectada
  details?: Record<string, unknown>;   // Datos extra (dependientes de la acción)
}

/** Store en memoria; se limpia al reiniciar el servidor */
const auditStore: AuditEvent[] = [];

/** Número máximo de eventos conservados en memoria */
const AUDIT_LIMIT = 1000;

/** Genera un ID único para cada evento de auditoría */
function nextAuditId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Registra un nuevo evento de auditoría.
 * Se inserta al inicio del array (más reciente primero).
 * Si se supera el límite, se trunca el array.
 */
export function logAuditEvent(input: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
  const event: AuditEvent = {
    id: nextAuditId(),
    timestamp: new Date().toISOString(),
    ...input,
  };

  auditStore.unshift(event); // insertar al inicio para mantener orden LIFO
  if (auditStore.length > AUDIT_LIMIT) {
    auditStore.length = AUDIT_LIMIT; // recortar al límite máximo
  }

  return event;
}

/**
 * Devuelve los N eventos más recientes del log de auditoría.
 * @param limit — Máximo de eventos a retornar (entre 1 y AUDIT_LIMIT)
 */
export function listAuditEvents(limit = 200): AuditEvent[] {
  return auditStore.slice(0, Math.max(1, Math.min(limit, AUDIT_LIMIT)));
}
