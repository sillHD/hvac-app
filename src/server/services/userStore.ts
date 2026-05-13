import fs from 'node:fs/promises';
import path from 'node:path';
import { Redis } from '@upstash/redis';

export type Role = 'root' | 'admin' | 'tech';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  passwordHash: string;
  sessionVersion?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const hasRedis =
  !!(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
  !!(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN);

const isVercelRuntime = !!process.env.VERCEL;

const redisRestUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisRestToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const localFile = path.join(process.cwd(), '.data', 'users.json');
const redis = hasRedis
  ? new Redis({
      url: redisRestUrl!,
      token: redisRestToken!,
    })
  : null;

let redisFallbackWarned = false;

function handleRedisError(error: unknown, operation: string): boolean {
  if (isVercelRuntime) {
    throw error;
  }

  if (!redisFallbackWarned) {
    redisFallbackWarned = true;
    console.warn(
      `[userStore] Redis unavailable during ${operation}. Falling back to local file storage (.data/users.json).`,
      error
    );
  }
  return true;
}

function ensurePersistentStorageForVercel() {
  // In Vercel filesystem is ephemeral; without Redis users will disappear on deploy/cold starts.
  if (isVercelRuntime && !redis) {
    throw new Error(
      'Persistent user storage is not configured in Vercel. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN or KV_REST_API_URL + KV_REST_API_TOKEN.'
    );
  }
}

async function readLocalUsers(): Promise<StoredUser[]> {
  try {
    const raw = await fs.readFile(localFile, 'utf8');
    return JSON.parse(raw) as StoredUser[];
  } catch {
    return [];
  }
}

async function writeLocalUsers(users: StoredUser[]): Promise<void> {
  await fs.mkdir(path.dirname(localFile), { recursive: true });
  await fs.writeFile(localFile, JSON.stringify(users, null, 2), 'utf8');
}

export async function listUsersStore(): Promise<StoredUser[]> {
  ensurePersistentStorageForVercel();
  if (redis) {
    try {
      const emails = (await redis.smembers<string[]>('users:index')) ?? [];
      if (!emails.length) return [];
      const users = await Promise.all(
        emails.map((e) => redis.get<StoredUser>(`user:${e}`))
      );
      return users.filter(Boolean) as StoredUser[];
    } catch (error) {
      handleRedisError(error, 'listUsersStore');
    }
  }
  return readLocalUsers();
}

export async function getUserByEmailStore(email: string): Promise<StoredUser | null> {
  ensurePersistentStorageForVercel();
  const normalized = email.trim().toLowerCase();
  if (redis) {
    try {
      return (await redis.get<StoredUser>(`user:${normalized}`)) ?? null;
    } catch (error) {
      handleRedisError(error, 'getUserByEmailStore');
    }
  }
  const users = await readLocalUsers();
  return users.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export async function getUserByIdStore(id: string): Promise<StoredUser | null> {
  ensurePersistentStorageForVercel();
  const users = await listUsersStore();
  return users.find((user) => user.id === id) ?? null;
}

export async function upsertUserStore(user: StoredUser): Promise<void> {
  ensurePersistentStorageForVercel();
  const normalized = user.email.trim().toLowerCase();
  const now = new Date().toISOString();
  const payload: StoredUser = { ...user, email: normalized, updatedAt: now, createdAt: user.createdAt || now };

  if (redis) {
    try {
      await redis.set(`user:${normalized}`, payload);
      await redis.sadd('users:index', normalized);
      return;
    } catch (error) {
      handleRedisError(error, 'upsertUserStore');
    }
  }

  const users = await readLocalUsers();
  const idx = users.findIndex((u) => u.email.toLowerCase() === normalized);
  if (idx >= 0) users[idx] = payload;
  else users.push(payload);
  await writeLocalUsers(users);
}

export async function deleteUserStore(email: string): Promise<void> {
  ensurePersistentStorageForVercel();
  const normalized = email.trim().toLowerCase();

  if (redis) {
    try {
      await redis.del(`user:${normalized}`);
      await redis.srem('users:index', normalized);
      return;
    } catch (error) {
      handleRedisError(error, 'deleteUserStore');
    }
  }

  const users = await readLocalUsers();
  await writeLocalUsers(users.filter((u) => u.email.toLowerCase() !== normalized));
}