/**
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * Rules:
 *  - Time window: ATTEMPT_WINDOW_MS (15 minutes)
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * Store:
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 */

/* Internal implementation detail. */
interface LoginAttemptState {
  attempts: number;        // Failed attempts in the active window.
  blockedUntilMs: number;  // Timestamp until which the identity is blocked (0 = clear).
  lastAttemptAtMs: number; // Timestamp of the last attempt, used to expire the window.
}

/* Internal implementation detail. */
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

/* Internal implementation detail. */
const BLOCK_MS = 10 * 60 * 1000;

/* Internal implementation detail. */
const MAX_ATTEMPTS = 5;

/* Internal implementation detail. */
const attemptsByKey = new Map<string, LoginAttemptState>();

/** Current timestamp in milliseconds. */
function nowMs(): number {
  return Date.now();
}

/* Internal implementation detail. */
function normalizeKey(input: string): string {
  return (input || '').trim().toLowerCase();
}

/* Internal implementation detail. */
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
 * Internal implementation detail.
 * Internal implementation detail.
 */
function resetIfWindowExpired(state: LoginAttemptState) {
  const now = nowMs();
  if (state.lastAttemptAtMs > 0 && now - state.lastAttemptAtMs > ATTEMPT_WINDOW_MS) {
    state.attempts = 0;
    state.blockedUntilMs = 0;
  }
}

/**
 * Internal implementation detail.
 * @returns { blocked, blockedSeconds, emailKey, ipKey }
 * Internal implementation detail.
 *   - blockedSeconds: remaining block duration in seconds
 * Internal implementation detail.
 */
export function getLoginRateLimitStatus(rawEmail: string, rawIp: string) {
  const emailKey = `email:${normalizeKey(rawEmail)}`;
  const ipKey = `ip:${normalizeKey(rawIp)}`;

  const emailState = getState(emailKey);
  const ipState = getState(ipKey);
  resetIfWindowExpired(emailState);
  resetIfWindowExpired(ipState);

  const now = nowMs();
  // Internal implementation detail.
  const blockedUntilMs = Math.max(emailState.blockedUntilMs, ipState.blockedUntilMs);

  return {
    blocked: blockedUntilMs > now,
    blockedSeconds: blockedUntilMs > now ? Math.ceil((blockedUntilMs - now) / 1000) : 0,
    emailKey,
    ipKey,
  };
}

/**
 * Internal implementation detail.
 * Internal implementation detail.
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
      state.blockedUntilMs = now + BLOCK_MS; // Activate the block.
      state.attempts = 0;                    // Reset the count for the next window.
    }
  }
}

/**
 * Internal implementation detail.
 * Internal implementation detail.
 */
export function registerLoginSuccess(emailKey: string, ipKey: string) {
  for (const key of [emailKey, ipKey]) {
    const state = getState(key);
    state.attempts = 0;
    state.blockedUntilMs = 0;
    state.lastAttemptAtMs = nowMs();
  }
}
