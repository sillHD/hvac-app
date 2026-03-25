import type { User } from '../auth';

export function canCreateUserRole(actorRole: User['role'], requestedRole: User['role']): boolean {
  if (actorRole === 'root') return requestedRole !== 'root';
  if (actorRole === 'admin') return requestedRole === 'technician';
  return false;
}

export function canManageTargetUser(actorRole: User['role'], targetRole: User['role']): boolean {
  if (actorRole === 'root') return targetRole !== 'root';
  if (actorRole === 'admin') return targetRole === 'technician';
  return false;
}
