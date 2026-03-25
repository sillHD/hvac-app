import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      return res.status(200).json({ ok: false, reason: 'missing_env' });
    }

    const redis = new Redis({ url, token });
    await redis.ping();

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(200).json({ ok: false, reason: e?.message ?? 'redis_error' });
  }
}