// Simple logging utility, can be expanded or replaced with winston/pino

export function logInfo(message: string, ...args: unknown[]) {
  console.log('[INFO]', message, ...args);
}

export function logError(message: string, ...args: unknown[]) {
  console.error('[ERROR]', message, ...args);
}
