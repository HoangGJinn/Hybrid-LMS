/** 13/11/2026, 10:42 */
export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
  });