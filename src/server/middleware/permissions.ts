import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import type { User } from '../auth';

export function requireRole(role: string, handler: NextApiHandler) {
  return (req: NextApiRequest, res: NextApiResponse) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (req as any).user;
    if (!user || user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return handler(req, res);
  };
}

export function requireAnyRole(roles: User['role'][], handler: NextApiHandler) {
  return (req: NextApiRequest, res: NextApiResponse) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return handler(req, res);
  };
}
