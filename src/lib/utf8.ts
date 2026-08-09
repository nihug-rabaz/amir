// Repair strings that were UTF-8 bytes misread as Latin-1 (common Hebrew mojibake).
export function repairUtf8Mojibake(value: string): string {
  if (!value || /[\u0590-\u05FF]/.test(value)) return value;
  if (![...value].some((c) => c.charCodeAt(0) > 127)) return value;
  try {
    const bytes = Uint8Array.from([...value].map((c) => c.charCodeAt(0) & 0xff));
    const fixed = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return /[\u0590-\u05FF]/.test(fixed) ? fixed : value;
  } catch {
    return value;
  }
}

export function jsonUtf8(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
