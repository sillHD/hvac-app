/**
 * logger.ts — Utilidad simple de logging.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * Uso:
 *   import { logInfo, logError } from '@/utils/logger';
 * Internal implementation detail.
 * Internal implementation detail.
 */

// Simple logging utility, can be expanded or replaced with winston/pino

export function logInfo(message: string, ...args: unknown[]) {
  console.log('[INFO]', message, ...args);
}

export function logError(message: string, ...args: unknown[]) {
  console.error('[ERROR]', message, ...args);
}
