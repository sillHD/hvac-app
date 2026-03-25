import type { NextApiRequest, NextApiResponse } from 'next';
import * as Auth from '../../../server/auth';

function pickAuthReader() {
  const a = Auth as any;
  return (
    a.getAuthenticatedUserFromRequest ||
    a.getUserFromRequest ||
    a.getCurrentUserFromRequest ||
    a.getCurrentUser ||
    a.requireAuth
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

    const user = await (reader.length >= 2 ? reader(req, res) : reader(req));

    if (!user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    return res.status(200).json({ user });
  } catch (err: any) {
    if (
      err?.name === 'TokenExpiredError' ||
      err?.name === 'JsonWebTokenError' ||
      err?.code === 'INVALID_TOKEN'
    ) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    return res.status(503).json({ error: 'temporarily_unavailable' });
  }
}