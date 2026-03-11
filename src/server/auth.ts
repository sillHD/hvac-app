// Server-side authentication helpers

export interface User {
  id: string;
  email: string;
  role: 'technician' | 'admin' | 'root';
}

// in-memory user store for prototyping; replace with a real database later
const users: Array<{ id: string; email: string; password: string; role: User['role'] }> = [
  { id: '1', email: 'root@hvac.local', password: 'rootpass', role: 'root' },
  { id: '2', email: 'tech@hvac.local', password: 'techpass', role: 'technician' },
  { id: '3', email: 'admin@hvac.local', password: 'adminpass', role: 'admin' },
];

export function verifyToken(token: string): User | null {
  // simple prototype: tokens are ``user:<id>``
  if (!token || !token.startsWith('user:')) return null;
  const id = token.split(':')[1];
  const u = users.find((u) => u.id === id);
  return u ? { id: u.id, email: u.email, role: u.role } : null;
}

export function signIn(email: string, password: string): { token: string; user: User } | null {
  const u = users.find((u) => u.email === email && u.password === password);
  if (!u) return null;
  // in real app generate JWT/secure session
  const token = `user:${u.id}`;
  return { token, user: { id: u.id, email: u.email, role: u.role } };
}
