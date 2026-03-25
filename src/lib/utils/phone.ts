export function formatUsPhoneWithCountry(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^1/, '').slice(0, 10);

  if (!digits.length) return '+1 ';
  if (digits.length < 4) return `+1 (${digits}`;
  if (digits.length < 7) return `+1 (${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export function isValidUsPhone(value: string): boolean {
  return /^\+1 \(\d{3}\) \d{3}-\d{4}$/.test(value);
}