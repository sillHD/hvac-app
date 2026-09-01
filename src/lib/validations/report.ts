/**
 * Internal implementation detail.
 *
 * Funciones exportadas:
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * Internal implementation detail.
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
