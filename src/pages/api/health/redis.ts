import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { withAuth } from '../../../server/middleware/auth';
import { requireAnyRole } from '../../../server/middleware/permissions';

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

    if (!url || !token) {
      return res.status(200).json({ ok: false, reason: 'missing_env_write_token_or_url' });
    }

    const redis = new Redis({ url, token });
    await redis.ping();

    // Verify write permissions explicitly (SET/GET/DEL).
    const key = `health:write-check:${Date.now()}`;
    const value = `ok-${Math.random().toString(36).slice(2, 8)}`;
    await redis.set(key, value, { ex: 60 });
    const readBack = await redis.get<string>(key);
    await redis.del(key);

    if (readBack !== value) {
      return res.status(200).json({ ok: false, reason: 'write_token_invalid_or_read_only' });
    }

    return res.status(200).json({ ok: true, write: true });
  } catch (e: unknown) {
    const reason = e instanceof Error ? e.message : 'redis_error';
    return res.status(200).json({ ok: false, reason });
  }
}

export default withAuth(requireAnyRole(['admin', 'root'], handler));