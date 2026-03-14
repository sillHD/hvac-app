/**
 * validations/report.ts — Validaciones del lado cliente para formularios de reportes.
 *
 * Funciones exportadas:
 *  validateReportForm(data) — Verifica que un objeto de reporte tenga los campos mínimos.
 *
 * Estado actual: Implementación básica (placeholder).
 * Para expandir, usar Zod (ya disponible en el proyecto) para validar
 * todos los campos del tipo Job definido en lib/types/index.ts.
 *
 * Ejemplo de mejora con Zod:
 *   const reportSchema = z.object({ description: z.string().min(1), price: z.number().min(0) });
 *   export const validateReportForm = (data: unknown) => reportSchema.safeParse(data).success;
 */

// Client-side or shared validation for job reports

export function validateReportForm(data: unknown): boolean {
  // placeholder: ensure required fields exist
  if (typeof data !== 'object' || data === null) return false;
  return (
    'description' in data &&
    typeof (data as { description: unknown }).description === 'string'
  );
}
