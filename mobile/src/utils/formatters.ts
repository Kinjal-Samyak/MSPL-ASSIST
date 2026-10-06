/** Matches the web app's formatter exactly (frontend/src/utils/formatters.ts) so a date reads the same on both clients. */
export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}
