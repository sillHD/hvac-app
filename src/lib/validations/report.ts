// Client-side or shared validation for job reports

export function validateReportForm(data: unknown): boolean {
  // placeholder: ensure required fields exist
  if (typeof data !== 'object' || data === null) return false;
  return (
    'description' in data &&
    typeof (data as { description: unknown }).description === 'string'
  );
}
