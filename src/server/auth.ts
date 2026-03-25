import type { NextApiRequest } from 'next';
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
    {
      id: '4',
      email: 'carol@hvac-example.com',
      password: process.env.ADMIN_CAROL_PASSWORD || '',
      role: 'admin',
      name: 'Carol',
    },
  ];

  for (const seed of seeds) {
    if (!seed.password) continue;
    const existing = await getUserByEmailStore(seed.email);
    if (existing) continue;

    const timestamp = new Date().toISOString();
    await upsertUserStore({
      id: seed.id,
      email: normalizeEmail(seed.email),
      name: seed.name,
      role: seed.role,
      passwordHash: seed.password,
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

  if (issuedAtMs > 0 && Date.now() - issuedAtMs > TOKEN_TTL_MS) {
    return null;
  }

  await ensureUsersReady();
  const storedUser = await getUserByIdStore(userId);
  if (!storedUser || !storedUser.active) return null;

  return toPublicUser(storedUser);
}

export async function signIn(email: string, password: string): Promise<{ token: string; user: User } | null> {
  const storedUser = await getActiveUserByEmail(email);
  if (!storedUser) return null;
  if (storedUser.passwordHash !== password) return null;

  const token = `user:${storedUser.id}:${Date.now()}`;
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
  if (input.role === 'root') {
    throw new Error('No se permite crear otro usuario root');
  }

  await ensureUsersReady();
  if (await getUserByEmailStore(email)) {
    throw new Error('User already exists');
  }

  const timestamp = new Date().toISOString();
  const createdUser: PersistedUser = {
    id: await nextUserId(),
    email,
    name: input.name || email,
    role: mapUserRoleToStoreRole(input.role),
    passwordHash: input.password,
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
    throw new Error('No se permite asignar el rol root');
  }

  const updated: PersistedUser = {
    ...current,
    email: nextEmail,
    name: patch.name ?? current.name,
    role: patch.role ? mapUserRoleToStoreRole(patch.role) : current.role,
    passwordHash: patch.password ?? current.passwordHash,
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
