/**
 * logger.ts — Utilidad simple de logging.
 *
 * Proporciona funciones de log consistentes con prefijos [INFO] y [ERROR].
 * Se puede reemplazar fácilmente por una librería más robusta en producción:
 *   - winston: logging con niveles, transports (archivo, consola, Datadog)
 *   - pino: alto rendimiento, ideal para Next.js API routes
 *
 * Uso:
 *   import { logInfo, logError } from '@/utils/logger';
 *   logInfo('Mensaje', { datos: 'extra' });
 *   logError('Error al guardar', err);
 */

// Simple logging utility, can be expanded or replaced with winston/pino

export function logInfo(message: string, ...args: unknown[]) {
  console.log('[INFO]', message, ...args);
}

export function logError(message: string, ...args: unknown[]) {
  console.error('[ERROR]', message, ...args);
}
