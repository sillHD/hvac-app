import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../auth';

export function withAuth(handler: NextApiHandler) {
  return (req: NextApiRequest, res: NextApiResponse) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // attach user to request for downstream handlers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).user = user;
    return handler(req, res);
  };
}
