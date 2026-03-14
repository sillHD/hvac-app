/**
 * validations/auth.ts — Validaciones del lado cliente para formularios de autenticación.
 *
 * Funciones exportadas:
 *  validateEmail(email) — Verifica que el string tenga formato de email válido.
 *
 * NOTA: Esta validación es solo para UX (feedback inmediato al usuario).
 * La validación real de credenciales ocurre en el servidor (server/auth.ts).
 * Nunca confiar solo en validaciones del lado cliente.
 */

// Client-side or shared validation for auth forms

export function validateEmail(email: string): boolean {
  return /^[^@]+@[^@]+\.[^@]+$/.test(email);
}
