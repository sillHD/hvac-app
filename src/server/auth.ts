// Server-side authentication helpers

export interface User {
  id: string;
  email: string;
  role: 'technician' | 'admin' | 'root';
}

interface StoredUser extends User {
  password: string;
  disabled: boolean;
}

export interface ManagedUser extends User {
  disabled: boolean;
}

let warnedMissingRootPassword = false;
let initializedUsers = false;
let userStore: StoredUser[] = [];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function nextUserId(): string {
  const max = userStore.reduce((acc, u) => Math.max(acc, Number.parseInt(u.id, 10) || 0), 0);
  return String(max + 1);
}

function initUsers() {
  if (initializedUsers) return;

  const rootPassword = process.env.ROOT_USER_PASSWORD || '';
  const adminCarolPassword = process.env.ADMIN_CAROL_PASSWORD || '';
  const techAlicePassword = process.env.TECH_ALICE_PASSWORD || '';
  const techBobPassword = process.env.TECH_BOB_PASSWORD || '';

  if (!rootPassword && !warnedMissingRootPassword) {
    warnedMissingRootPassword = true;
    console.warn('[auth] ROOT_USER_PASSWORD is not configured; root login is disabled until it is set.');
  }

  const configured: StoredUser[] = [
    { id: '0', email: 'ismaelcorra@gmail.com', password: rootPassword, role: 'root', disabled: false },
    { id: '2', email: 'alice@hvac-example.com', password: techAlicePassword, role: 'technician', disabled: false },
    { id: '3', email: 'bob@hvac-example.com', password: techBobPassword, role: 'technician', disabled: false },
    { id: '4', email: 'carol@hvac-example.com', password: adminCarolPassword, role: 'admin', disabled: false },
  ];

  userStore = configured
    .filter((u) => !!u.password)
    .map((u) => ({ ...u, email: normalizeEmail(u.email) }));
  initializedUsers = true;
}

function getUsers(): StoredUser[] {
  initUsers();
  return userStore;
}

export function verifyToken(token: string): User | null {
  // simple prototype: tokens are ``user:<id>``
  if (!token || !token.startsWith('user:')) return null;
  const id = token.split(':')[1];
  const users = getUsers();
  const u = users.find((u) => u.id === id && !u.disabled);
  return u ? { id: u.id, email: u.email, role: u.role } : null;
}

export function signIn(email: string, password: string): { token: string; user: User } | null {
  const users = getUsers();
  const normalizedEmail = normalizeEmail(email);
  const u = users.find((u) => !u.disabled && u.email === normalizedEmail && u.password === password);
  if (!u) return null;
  // in real app generate JWT/secure session
  const token = `user:${u.id}`;
  return { token, user: { id: u.id, email: u.email, role: u.role } };
}

export function canRecoverPassword(email: string): boolean {
  const users = getUsers();
  const normalizedEmail = normalizeEmail(email);
  return users.some((u) => !u.disabled && u.email === normalizedEmail);
}

export function listManagedUsers(): ManagedUser[] {
  return getUsers().map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    disabled: u.disabled,
  }));
}

export function createUser(input: {
  email: string;
  role: User['role'];
  password: string;
  disabled?: boolean;
}): ManagedUser {
  const email = normalizeEmail(input.email);
  if (!email || !input.password) {
    throw new Error('Email and password are required');
  }
  if (input.role === 'root') {
    throw new Error('No se permite crear otro usuario root');
  }
  if (getUsers().some((u) => u.email === email)) {
    throw new Error('User already exists');
  }

  const created: StoredUser = {
    id: nextUserId(),
    email,
    role: input.role,
    password: input.password,
    disabled: !!input.disabled,
  };
  userStore.push(created);
  return { id: created.id, email: created.email, role: created.role, disabled: created.disabled };
}

export function updateUser(
  id: string,
  patch: Partial<{ email: string; role: User['role']; password: string; disabled: boolean }>
): ManagedUser | null {
  const idx = getUsers().findIndex((u) => u.id === id);
  if (idx < 0) return null;

  const current = userStore[idx];
  const nextEmail = patch.email ? normalizeEmail(patch.email) : current.email;
  const emailTakenByOther = userStore.some((u) => u.id !== id && u.email === nextEmail);
  if (emailTakenByOther) {
    throw new Error('Email already in use');
  }

  if (current.role === 'root') {
    if (patch.disabled === true) throw new Error('Root user cannot be blocked');
    if (patch.role && patch.role !== 'root') throw new Error('Root role cannot be changed');
  }
  if (current.role !== 'root' && patch.role === 'root') {
    throw new Error('No se permite asignar el rol root');
  }

  const updated: StoredUser = {
    ...current,
    email: nextEmail,
    role: patch.role ?? current.role,
    disabled: patch.disabled ?? current.disabled,
    password: patch.password ?? current.password,
  };

  userStore[idx] = updated;
  return { id: updated.id, email: updated.email, role: updated.role, disabled: updated.disabled };
}

export function deleteUser(id: string): boolean {
  const idx = getUsers().findIndex((u) => u.id === id);
  if (idx < 0) return false;
  if (userStore[idx].role === 'root') {
    throw new Error('Root user cannot be deleted');
  }
  userStore.splice(idx, 1);
  return true;
}

export function canViewAllReports(role: User['role']): boolean {
  return role === 'admin' || role === 'root';
}

export function canEditOrDeleteReports(role: User['role']): boolean {
  return role === 'admin' || role === 'root';
}
