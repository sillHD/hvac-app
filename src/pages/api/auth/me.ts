import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedUserFromRequest } from '../../utils/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    // Debe devolver null/undefined si no hay sesión válida
    const user = await getAuthenticatedUserFromRequest(req);

    if (!user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    return res.status(200).json({ user });
  } catch (err: any) {
    // Token inválido/expirado => 401
    if (
      err?.name === 'TokenExpiredError' ||
      err?.name === 'JsonWebTokenError' ||
      err?.code === 'INVALID_TOKEN'
    ) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    // Error temporal (DB/red/proveedor) => NO 401
    return res.status(503).json({ error: 'temporarily_unavailable' });
  }
}