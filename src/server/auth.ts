import type { NextApiRequest } from 'next';
import { compare as bcryptCompare, hash as bcryptHash } from 'bcryptjs';
import {
  deleteUserStore,
  getUserByEmailStore,
  getUserByIdStore,
  listUsersStore,
  type Role as StoreRole,
  type StoredUser as PersistedUser,
  upsertUserStore,
} from './services/userStore';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'technician' | 'admin' | 'root';
}

export interface ManagedUser extends User {
  disabled: boolean;
}

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const PASSWORD_HASH_ROUNDS = Number.parseInt(process.env.PASSWORD_HASH_ROUNDS || '12', 10);

let seedPromise: Promise<void> | null = null;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mapStoreRoleToUserRole(role: StoreRole): User['role'] {
  return role === 'tech' ? 'technician' : role;
}

function mapUserRoleToStoreRole(role: User['role']): StoreRole {
  return role === 'technician' ? 'tech' : role;
}

function normalizePasswordRounds(): number {
  if (Number.isFinite(PASSWORD_HASH_ROUNDS) && PASSWORD_HASH_ROUNDS >= 8 && PASSWORD_HASH_ROUNDS <= 14) {
    return PASSWORD_HASH_ROUNDS;
  }
  return 12;
}

function isBcryptHash(passwordHash: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(passwordHash);
}

async function hashPassword(plainPassword: string): Promise<string> {
  return bcryptHash(plainPassword, normalizePasswordRounds());
}

async function verifyPassword(storedPasswordHash: string, plainPassword: string): Promise<boolean> {
  if (isBcryptHash(storedPasswordHash)) {
    return bcryptCompare(plainPassword, storedPasswordHash);
  }

  // Legacy fallback for users created before password hashing was introduced.
  return storedPasswordHash === plainPassword;
}

function getSessionVersion(user: PersistedUser): number {
  return user.sessionVersion && user.sessionVersion > 0 ? user.sessionVersion : 1;
}

function toPublicUser(user: PersistedUser): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: mapStoreRoleToUserRole(user.role),
  };
}

function toManagedUser(user: PersistedUser): ManagedUser {
  return {
    ...toPublicUser(user),
    disabled: !user.active,
  };
}

async function nextUserId(): Promise<string> {
  const users = await listUsersStore();
  const maxId = users.reduce((highest, current) => {
    const numericId = Number.parseInt(current.id, 10);
    return Number.isFinite(numericId) ? Math.max(highest, numericId) : highest;
  }, 0);
  return String(maxId + 1);
}

async function ensureSeedUsers(): Promise<void> {
  const seeds: Array<{
    id: string;
    email: string;
    password: string;
    role: StoreRole;
    name: string;
  }> = [
    {
      id: '0',
      email: 'ismaelcorra@gmail.com',
      password: process.env.ROOT_USER_PASSWORD || '',
      role: 'root',
      name: 'Root',
    },
    {
      id: '1',
      email: 'carol@hvac-example.com',
      password: process.env.ADMIN_CAROL_PASSWORD || '',
      role: 'admin',
      name: 'Carol',
    },
    {
      id: '2',
      email: 'alice@hvac-example.com',
      password: process.env.TECH_ALICE_PASSWORD || '',
      role: 'tech',
      name: 'Alice',
    },
    {
      id: '3',
      email: 'bob@hvac-example.com',
      password: process.env.TECH_BOB_PASSWORD || '',
      role: 'tech',
      name: 'Bob',
    },
  ];

  for (const seed of seeds) {
    if (!seed.password) continue;
    const existing = await getUserByEmailStore(seed.email);
    if (existing) continue;

    const timestamp = new Date().toISOString();
    const passwordHash = await hashPassword(seed.password);
    await upsertUserStore({
      id: seed.id,
      email: normalizeEmail(seed.email),
      name: seed.name,
      role: seed.role,
      passwordHash,
      sessionVersion: 1,
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
}

async function ensureUsersReady(): Promise<void> {
  if (!seedPromise) {
    seedPromise = ensureSeedUsers().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  await seedPromise;
}

async function getActiveUserByEmail(email: string): Promise<PersistedUser | null> {
  await ensureUsersReady();
  const storedUser = await getUserByEmailStore(email);
  if (!storedUser || !storedUser.active) return null;
  return storedUser;
}

export async function verifyToken(token: string): Promise<User | null> {
  if (!token || !token.startsWith('user:')) return null;

  const parts = token.split(':');
  const userId = parts[1];
  const issuedAtMs = Number(parts[2] || '0');
  const sessionVersion = Number(parts[3] || '1');

  if (issuedAtMs > 0 && Date.now() - issuedAtMs > TOKEN_TTL_MS) {
    return null;
  }

  await ensureUsersReady();
  const storedUser = await getUserByIdStore(userId);
  if (!storedUser || !storedUser.active) return null;
  if (getSessionVersion(storedUser) !== sessionVersion) return null;

  return toPublicUser(storedUser);
}

export async function signIn(email: string, password: string): Promise<{ token: string; user: User } | null> {
  const storedUser = await getActiveUserByEmail(email);
  if (!storedUser) return null;
  const validPassword = await verifyPassword(storedUser.passwordHash, password);
  if (!validPassword) return null;

  // Upgrade legacy plaintext password to bcrypt on successful login.
  if (!isBcryptHash(storedUser.passwordHash)) {
    storedUser.passwordHash = await hashPassword(password);
    await upsertUserStore(storedUser);
  }

  const token = `user:${storedUser.id}:${Date.now()}:${getSessionVersion(storedUser)}`;
  return {
    token,
    user: toPublicUser(storedUser),
  };
}

export async function signInWithPassword(email: string, password: string) {
  return signIn(email, password);
}

export async function canRecoverPassword(email: string): Promise<boolean> {
  return !!(await getActiveUserByEmail(email));
}

export async function listManagedUsers(): Promise<ManagedUser[]> {
  await ensureUsersReady();
  const users = await listUsersStore();
  return users.map(toManagedUser).sort((left, right) => left.email.localeCompare(right.email));
}

export async function createUser(input: {
  email: string;
  role: User['role'];
  password: string;
  disabled?: boolean;
  name?: string;
}): Promise<ManagedUser> {
  const email = normalizeEmail(input.email);
  if (!email || !input.password) {
    throw new Error('Email and password are required');
  }
  if (input.role === 'technician' && !input.name?.trim()) {
    throw new Error('Technician name is required');
  }
  if (input.role === 'root') {
    throw new Error('Creating another root user is not allowed');
  }

  await ensureUsersReady();
  if (await getUserByEmailStore(email)) {
    throw new Error('User already exists');
  }

  const timestamp = new Date().toISOString();
  const passwordHash = await hashPassword(input.password);
  const createdUser: PersistedUser = {
    id: await nextUserId(),
    email,
    name: input.name?.trim() || email,
    role: mapUserRoleToStoreRole(input.role),
    passwordHash,
    sessionVersion: 1,
    active: !input.disabled,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await upsertUserStore(createdUser);
  return toManagedUser(createdUser);
}

export async function updateUser(
  id: string,
  patch: Partial<{ email: string; role: User['role']; password: string; disabled: boolean; name: string }>
): Promise<ManagedUser | null> {
  await ensureUsersReady();
  const current = await getUserByIdStore(id);
  if (!current) return null;

  const nextEmail = patch.email ? normalizeEmail(patch.email) : current.email;
  const sameEmailUser = await getUserByEmailStore(nextEmail);
  if (sameEmailUser && sameEmailUser.id !== id) {
    throw new Error('Email already in use');
  }

  const currentRole = mapStoreRoleToUserRole(current.role);
  if (currentRole === 'root') {
    if (patch.disabled === true) throw new Error('Root user cannot be blocked');
    if (patch.role && patch.role !== 'root') throw new Error('Root role cannot be changed');
  }
  if (currentRole !== 'root' && patch.role === 'root') {
    throw new Error('Assigning the root role is not allowed');
  }

  const nextRole = patch.role ? mapUserRoleToStoreRole(patch.role) : current.role;
  const nextName = patch.name !== undefined ? patch.name.trim() : current.name;
  if (nextRole === 'tech' && !nextName) {
    throw new Error('Technician name is required');
  }

  const hasPasswordChange = typeof patch.password === 'string' && patch.password.length > 0;
  const nextPasswordHash = hasPasswordChange ? await hashPassword(patch.password!) : current.passwordHash;

  const updated: PersistedUser = {
    ...current,
    email: nextEmail,
    name: nextName,
    role: nextRole,
    passwordHash: nextPasswordHash,
    sessionVersion: hasPasswordChange ? getSessionVersion(current) + 1 : getSessionVersion(current),
    active: patch.disabled !== undefined ? !patch.disabled : current.active,
    updatedAt: new Date().toISOString(),
  };

  if (current.email !== nextEmail) {
    await deleteUserStore(current.email);
  }
  await upsertUserStore(updated);
  return toManagedUser(updated);
}

export async function deleteUser(id: string): Promise<boolean> {
  await ensureUsersReady();
  const current = await getUserByIdStore(id);
  if (!current) return false;
  if (current.role === 'root') {
    throw new Error('Root user cannot be deleted');
  }

  await deleteUserStore(current.email);
  return true;
}

export async function invalidateUserSessions(userId: string): Promise<boolean> {
  await ensureUsersReady();
  const current = await getUserByIdStore(userId);
  if (!current) return false;

  await upsertUserStore({
    ...current,
    sessionVersion: getSessionVersion(current) + 1,
  });
  return true;
}

export async function listUsers() {
  await ensureUsersReady();
  return listUsersStore();
}

export async function saveUser(user: PersistedUser) {
  await ensureUsersReady();
  await upsertUserStore(user);
}

export async function getAuthenticatedUserFromRequest(req: NextApiRequest): Promise<User | null> {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
  if (!token) return null;
  return verifyToken(token);
}

export function canViewAllReports(role: User['role']): boolean {
  return role === 'admin' || role === 'root';
}

export function canEditOrDeleteReports(role: User['role']): boolean {
  return role === 'admin' || role === 'root';
}

export function canTechnicianEditOwnReports(role: User['role']): boolean {
  return role === 'technician';
}
