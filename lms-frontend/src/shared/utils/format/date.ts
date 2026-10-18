const toDate = (d: string | number | Date) =>
  d instanceof Date ? d : new Date(d);
export const formatDate = (d: string | number | Date) =>
  toDate(d).toLocaleDateString('en-US', { dateStyle: 'medium' });
export const formatDateTime = (d: string | number | Date) =>
  toDate(d).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
export const formatDuration = (sec: number) => {
  const h = Math.floor(sec / 3600),
    m = Math.floor((sec % 3600) / 60),
    s = Math.floor(sec % 60);
  return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`;
};
