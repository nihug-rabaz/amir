// Validates an Israeli ID number using the official check-digit (Luhn-style) algorithm.
export function isValidIsraeliID(value: string): boolean {
  const clean = String(value || '').trim();
  if (!/^\d{1,9}$/.test(clean)) return false;
  const padded = clean.padStart(9, '0');
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let step = Number(padded[i]) * ((i % 2) + 1);
    if (step > 9) step -= 9;
    sum += step;
  }
  return sum % 10 === 0;
}

export function normalizeIsraeliID(value: string | null | undefined): string {
  return String(value || '').replace(/\D/g, '');
}

// Validates a MyIDF SMS auth code: 8 chars, 6 digits + 2 letters (one upper, one lower), letters grouped at start or end.
export function isValidAuthCode(code: string): boolean {
  const value = String(code || '').trim();
  if (value.length !== 8) return false;
  const digits = value.match(/\d/g) || [];
  const letters = value.match(/[a-zA-Z]/g) || [];
  if (digits.length !== 6 || letters.length !== 2) return false;
  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value)) return false;
  return /^[a-zA-Z]{2}\d{6}$/.test(value) || /^\d{6}[a-zA-Z]{2}$/.test(value);
}
