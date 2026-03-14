import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createUser,
  deleteUser,
  listManagedUsers,
  updateUser,
  type User,
} from '../../../server/auth';
import { withAuth } from '../../../server/middleware/auth';
import { requireRole } from '../../../server/middleware/permissions';

function parseRole(value: unknown): User['role'] | null {
  if (value === 'technician' || value === 'admin' || value === 'root') {
    return value;
  }
  return null;
}

function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({ users: listManagedUsers() });
  }

  if (req.method === 'POST') {
    const { email, role, password, disabled } = req.body || {};
    const parsedRole = parseRole(role);
    if (!email || !password || !parsedRole) {
      return res.status(400).json({ error: 'Email, role and password are required' });
    }

    try {
      const user = createUser({
        email: String(email),
        password: String(password),
        role: parsedRole,
        disabled: Boolean(disabled),
      });
      return res.status(201).json({ user });
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  }

  if (req.method === 'PATCH') {
    const { id, email, role, password, disabled } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: 'User id is required' });
    }

    let parsedRole: User['role'] | undefined;
    if (role !== undefined) {
      const roleCandidate = parseRole(role);
      if (!roleCandidate) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      parsedRole = roleCandidate;
    }

    try {
      const updated = updateUser(String(id), {
        email: typeof email === 'string' ? email : undefined,
        role: parsedRole,
        password: typeof password === 'string' && password.length > 0 ? password : undefined,
        disabled: typeof disabled === 'boolean' ? disabled : undefined,
      });

      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({ user: updated });
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  }

  if (req.method === 'DELETE') {
    const id = String(req.query.id || '');
    if (!id) {
      return res.status(400).json({ error: 'User id is required' });
    }

    try {
      const removed = deleteUser(id);
      if (!removed) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  }

  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  return res.status(405).end('Method Not Allowed');
}

export default withAuth(requireRole('root', handler));
