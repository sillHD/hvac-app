import type { User } from '../types';

export function canViewLogs(role?: User['role'] | null): boolean {
  return role === 'admin' || role === 'root';
}

export function canManageUsers(role?: User['role'] | null): boolean {
  return role === 'root';
}
