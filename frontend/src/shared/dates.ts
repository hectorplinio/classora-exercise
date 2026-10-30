/** `2026-11-30` → `30/11/2026`. Read as a calendar date: no time zone can shift the day. */
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day ?? ''}/${month ?? ''}/${year ?? ''}`;
}

const dateTimeFormat = new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' });

/** An RFC 3339 instant in the user's time zone. */
export function formatDateTime(dateTime: string): string {
  return dateTimeFormat.format(new Date(dateTime));
}
