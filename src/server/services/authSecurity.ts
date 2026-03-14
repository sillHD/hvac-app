interface LoginAttemptState {
  attempts: number;
  blockedUntilMs: number;
  lastAttemptAtMs: number;
}

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attemptsByKey = new Map<string, LoginAttemptState>();

function nowMs(): number {
  return Date.now();
}

function normalizeKey(input: string): string {
  return (input || '').trim().toLowerCase();
}

function getState(key: string): LoginAttemptState {
  const current = attemptsByKey.get(key);
  if (!current) {
    const fresh: LoginAttemptState = { attempts: 0, blockedUntilMs: 0, lastAttemptAtMs: 0 };
    attemptsByKey.set(key, fresh);
    return fresh;
  }
  return current;
}

function resetIfWindowExpired(state: LoginAttemptState) {
  const now = nowMs();
  if (state.lastAttemptAtMs > 0 && now - state.lastAttemptAtMs > ATTEMPT_WINDOW_MS) {
    state.attempts = 0;
    state.blockedUntilMs = 0;
  }
}

export function getLoginRateLimitStatus(rawEmail: string, rawIp: string) {
  const emailKey = `email:${normalizeKey(rawEmail)}`;
  const ipKey = `ip:${normalizeKey(rawIp)}`;

  const emailState = getState(emailKey);
  const ipState = getState(ipKey);
  resetIfWindowExpired(emailState);
  resetIfWindowExpired(ipState);

  const now = nowMs();
  const blockedUntilMs = Math.max(emailState.blockedUntilMs, ipState.blockedUntilMs);

  return {
    blocked: blockedUntilMs > now,
    blockedSeconds: blockedUntilMs > now ? Math.ceil((blockedUntilMs - now) / 1000) : 0,
    emailKey,
    ipKey,
  };
}

export function registerLoginFailure(emailKey: string, ipKey: string) {
  const now = nowMs();
  const keys = [emailKey, ipKey];

  for (const key of keys) {
    const state = getState(key);
    resetIfWindowExpired(state);
    state.attempts += 1;
    state.lastAttemptAtMs = now;
    if (state.attempts >= MAX_ATTEMPTS) {
      state.blockedUntilMs = now + BLOCK_MS;
      state.attempts = 0;
    }
  }
}

export function registerLoginSuccess(emailKey: string, ipKey: string) {
  for (const key of [emailKey, ipKey]) {
    const state = getState(key);
    state.attempts = 0;
    state.blockedUntilMs = 0;
    state.lastAttemptAtMs = nowMs();
  }
}
