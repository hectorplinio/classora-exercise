/** `2026-11-30` → `30/11/2026`. Read as a calendar date: no time zone can shift the day. */
export function formatDate(date: string): string {
  return date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1');
}

const dateTimeFormat = new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' });

/** An RFC 3339 instant in the user's time zone. */
export function formatDateTime(dateTime: string): string {
  return dateTimeFormat.format(new Date(dateTime));
}

/** Today in the user's time zone, as `YYYY-MM-DD` (the format of the contract's dates). */
export function today(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
