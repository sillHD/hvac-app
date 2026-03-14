/**
 * authSecurity.ts — Rate limiting para intentos de login.
 *
 * Protege el endpoint /api/auth/login contra ataques de fuerza bruta
 * rastreando los intentos fallidos tanto por email como por dirección IP.
 *
 * Reglas:
 *  - Ventana de tiempo: ATTEMPT_WINDOW_MS (15 minutos)
 *  - Intentos máximos: MAX_ATTEMPTS (5) en la ventana
 *  - Duración del bloqueo: BLOCK_MS (10 minutos) al superar el límite
 *  - El bloqueo se aplica a nivel de EMAIL y a nivel de IP por separado.
 *    (basta con que uno esté bloqueado para bloquear el intento)
 *
 * Store:
 *  - En memoria (se reinicia con el servidor). Para producción considerar Redis.
 *
 * API pública:
 *  getLoginRateLimitStatus(email, ip) — Verifica si está bloqueado
 *  registerLoginFailure(emailKey, ipKey) — Registra un intento fallido
 *  registerLoginSuccess(emailKey, ipKey) — Limpia el estado al loguearse correctamente
 */

/** Estado de intentos de login para una clave (email o IP) */
interface LoginAttemptState {
  attempts: number;        // Intentos fallidos en la ventana activa
  blockedUntilMs: number;  // Timestamp hasta el cual está bloqueado (0 = libre)
  lastAttemptAtMs: number; // Timestamp del último intento (para expirar la ventana)
}

/** Ventana de 15 minutos para contar intentos */
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

/** Duración del bloqueo al superar el límite: 10 minutos */
const BLOCK_MS = 10 * 60 * 1000;

/** Número máximo de fallos antes de bloquear */
const MAX_ATTEMPTS = 5;

/** Map en memoria: clave (email: o ip:) → estado de intentos */
const attemptsByKey = new Map<string, LoginAttemptState>();

/** Timestamp actual en ms */
function nowMs(): number {
  return Date.now();
}

/** Normaliza una clave a minúsculas sin espacios para comparaciones consistentes */
function normalizeKey(input: string): string {
  return (input || '').trim().toLowerCase();
}

/** Obtiene o inicializa el estado para una clave dada */
function getState(key: string): LoginAttemptState {
  const current = attemptsByKey.get(key);
  if (!current) {
    const fresh: LoginAttemptState = { attempts: 0, blockedUntilMs: 0, lastAttemptAtMs: 0 };
    attemptsByKey.set(key, fresh);
    return fresh;
  }
  return current;
}

/**
 * Si ha pasado más de ATTEMPT_WINDOW_MS desde el último intento,
 * resetea el contador (la ventana de tiempo ha expirado).
 */
function resetIfWindowExpired(state: LoginAttemptState) {
  const now = nowMs();
  if (state.lastAttemptAtMs > 0 && now - state.lastAttemptAtMs > ATTEMPT_WINDOW_MS) {
    state.attempts = 0;
    state.blockedUntilMs = 0;
  }
}

/**
 * Verifica el estado actual de rate limit para un email e IP específicos.
 * @returns { blocked, blockedSeconds, emailKey, ipKey }
 *   - blocked: true si el intento debe ser rechazado
 *   - blockedSeconds: segundos restantes de bloqueo
 *   - emailKey/ipKey: claves normalizadas para pasar a registerLoginFailure/Success
 */
export function getLoginRateLimitStatus(rawEmail: string, rawIp: string) {
  const emailKey = `email:${normalizeKey(rawEmail)}`;
  const ipKey = `ip:${normalizeKey(rawIp)}`;

  const emailState = getState(emailKey);
  const ipState = getState(ipKey);
  resetIfWindowExpired(emailState);
  resetIfWindowExpired(ipState);

  const now = nowMs();
  // Bloqueado si cualquiera de los dos (email o IP) está dentro del período de bloqueo
  const blockedUntilMs = Math.max(emailState.blockedUntilMs, ipState.blockedUntilMs);

  return {
    blocked: blockedUntilMs > now,
    blockedSeconds: blockedUntilMs > now ? Math.ceil((blockedUntilMs - now) / 1000) : 0,
    emailKey,
    ipKey,
  };
}

/**
 * Registra un intento fallido para email e IP.
 * Si se alcanza MAX_ATTEMPTS, bloquea por BLOCK_MS y resetea el contador.
 */
export function registerLoginFailure(emailKey: string, ipKey: string) {
  const now = nowMs();
  const keys = [emailKey, ipKey];

  for (const key of keys) {
    const state = getState(key);
    resetIfWindowExpired(state);
    state.attempts += 1;
    state.lastAttemptAtMs = now;
    if (state.attempts >= MAX_ATTEMPTS) {
      state.blockedUntilMs = now + BLOCK_MS; // activar bloqueo
      state.attempts = 0;                    // resetear contador para próxima ventana
    }
  }
}

/**
 * Limpia el estado de rate limit al loguearse correctamente.
 * Evita que intentos previos fallidos afecten futuros logins.
 */
export function registerLoginSuccess(emailKey: string, ipKey: string) {
  for (const key of [emailKey, ipKey]) {
    const state = getState(key);
    state.attempts = 0;
    state.blockedUntilMs = 0;
    state.lastAttemptAtMs = nowMs();
  }
}
