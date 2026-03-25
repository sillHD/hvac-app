export type AppRole = 'technician' | 'admin' | 'root';

export function canEditCustomers(role?: AppRole | null): boolean {
  return role === 'technician' || role === 'admin' || role === 'root';
}

export function canDeleteCustomers(role?: AppRole | null): boolean {
  return role === 'admin' || role === 'root';
}