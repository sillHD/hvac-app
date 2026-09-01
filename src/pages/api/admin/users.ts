/**
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * Restricciones:
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * Internal implementation detail.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createUser,
  deleteUser,
  listManagedUsers,
  updateUser,
  type User,
} from '../../../server/auth';
import { withAuth } from '../../../server/middleware/auth';
import { requireAnyRole } from '../../../server/middleware/permissions';
import { logAuditEvent } from '../../../server/services/audit';
import { canCreateUserRole, canManageTargetUser } from '../../../server/services/authorization';

function parseRole(value: unknown): User['role'] | null {
  if (value === 'technician' || value === 'admin' || value === 'root') {
    return value;
  }
  return null;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actor = (req as any).user as User;
  const isAdmin = actor.role === 'admin';

  if (req.method === 'GET') {
    return res.status(200).json({ users: await listManagedUsers() });
  }

  if (req.method === 'POST') {
    const { email, name, role, password, disabled } = req.body || {};
    const parsedRole = parseRole(role);
    if (!email || !password || !parsedRole) {
      return res.status(400).json({ error: 'Email, role and password are required' });
    }
    if (parsedRole === 'technician' && (!name || !String(name).trim())) {
      return res.status(400).json({ error: 'Technician name is required' });
    }
    // Internal implementation detail.
    if (!canCreateUserRole(actor.role, parsedRole)) {
      return res.status(403).json({ error: 'Admins can only create technician users' });
    }

    try {
      const user = await createUser({
        email: String(email),
        name: typeof name === 'string' ? name.trim() : undefined,
        password: String(password),
        role: parsedRole,
        disabled: Boolean(disabled),
      });
      logAuditEvent({
        action: 'user.create',
        actorEmail: actor.email,
        actorRole: actor.role,
        targetType: 'user',
        targetId: user.id,
        details: { email: user.email, name: user.name, role: user.role },
      });
      return res.status(201).json({ user });
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  }

  if (req.method === 'PATCH') {
    const { id, email, name, role, password, disabled } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: 'User id is required' });
    }

    // Internal implementation detail.
    if (isAdmin) {
      const allUsers = await listManagedUsers();
      const target = allUsers.find((u) => u.id === String(id));
      if (!target || !canManageTargetUser(actor.role, target.role)) {
        return res.status(403).json({ error: 'Admins can only edit technician users' });
      }
    }

    let parsedRole: User['role'] | undefined;
    if (role !== undefined) {
      const roleCandidate = parseRole(role);
      if (!roleCandidate) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      // Internal implementation detail.
      if (!canCreateUserRole(actor.role, roleCandidate)) {
        return res.status(403).json({ error: 'Admins can only assign the technician role' });
      }
      parsedRole = roleCandidate;
    }

    try {
      const updated = await updateUser(String(id), {
        email: typeof email === 'string' ? email : undefined,
        name: typeof name === 'string' ? name.trim() : undefined,
        role: parsedRole,
        password: typeof password === 'string' && password.length > 0 ? password : undefined,
        disabled: typeof disabled === 'boolean' ? disabled : undefined,
      });

      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }

      logAuditEvent({
        action: 'user.update',
        actorEmail: actor.email,
        actorRole: actor.role,
        targetType: 'user',
        targetId: updated.id,
        details: {
          email: updated.email,
          name: updated.name,
          role: updated.role,
          disabled: updated.disabled,
          changedPassword: typeof password === 'string' && password.length > 0,
        },
      });

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

    // Internal implementation detail.
    if (isAdmin) {
      const allUsers = await listManagedUsers();
      const target = allUsers.find((u) => u.id === id);
      if (!target || !canManageTargetUser(actor.role, target.role)) {
        return res.status(403).json({ error: 'Admins can only delete technician users' });
      }
    }

    try {
      const removed = await deleteUser(id);
      if (!removed) {
        return res.status(404).json({ error: 'User not found' });
      }
      logAuditEvent({
        action: 'user.delete',
        actorEmail: actor.email,
        actorRole: actor.role,
        targetType: 'user',
        targetId: id,
      });
      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  }

  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  return res.status(405).end('Method Not Allowed');
}

export default withAuth(requireAnyRole(['admin', 'root'], handler));
