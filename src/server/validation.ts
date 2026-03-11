// Centralized server-side validation logic

export function validateLogin(email: string, password: string): boolean {
  // basic sanity checks
  return Boolean(email && password);
}

export function validateReport(data: unknown): boolean {
  // TODO: validate job report structure
  return !!data;
}
