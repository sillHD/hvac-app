import type { NextApiRequest, NextApiResponse } from 'next';
import { listManagedUsers } from '../../../server/auth';
import { withAuth } from '../../../server/middleware/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const technicians = (await listManagedUsers())
    .filter((user) => user.role === 'technician' && !user.disabled)
    .map((user) => ({
      id: user.id,
      name: user.name || user.email,
      email: user.email,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return res.status(200).json({ technicians });
}

export default withAuth(handler);