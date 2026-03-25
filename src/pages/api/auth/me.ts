import type { NextApiRequest, NextApiResponse } from 'next';
import * as Auth from '../../../server/auth';

type AuthReader =
  | ((req: NextApiRequest) => unknown | Promise<unknown>)
  | ((req: NextApiRequest, res: NextApiResponse) => unknown | Promise<unknown>);

function pickAuthReader() {
  const a = Auth as Record<string, unknown>;
  return (
    (a.getAuthenticatedUserFromRequest as AuthReader | undefined) ||
    (a.getUserFromRequest as AuthReader | undefined) ||
    (a.getCurrentUserFromRequest as AuthReader | undefined) ||
    (a.getCurrentUser as AuthReader | undefined) ||
    (a.requireAuth as AuthReader | undefined)
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const reader = pickAuthReader();

    if (typeof reader !== 'function') {
      return res.status(503).json({ error: 'auth_reader_not_configured' });
    }

    const user = await (reader.length >= 2
      ? (reader as (req: NextApiRequest, res: NextApiResponse) => unknown | Promise<unknown>)(req, res)
      : (reader as (req: NextApiRequest) => unknown | Promise<unknown>)(req));

    if (!user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    return res.status(200).json({ user });
  } catch (err: unknown) {
    const errorRecord = typeof err === 'object' && err !== null ? (err as Record<string, unknown>) : null;
    const errorName = typeof errorRecord?.name === 'string' ? errorRecord.name : '';
    const errorCode = typeof errorRecord?.code === 'string' ? errorRecord.code : '';
    if (
      errorName === 'TokenExpiredError' ||
      errorName === 'JsonWebTokenError' ||
      errorCode === 'INVALID_TOKEN'
    ) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    return res.status(503).json({ error: 'temporarily_unavailable' });
  }
}