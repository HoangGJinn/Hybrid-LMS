/** Semester dates are entered and shown in Vietnam time (UTC+7, no daylight saving). */
const VN_OFFSET = '+07:00';
const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: VN_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

interface CalendarDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

const pad = (value: number, length = 2): string =>
  String(value).padStart(length, '0');

/**
 * Reads `dd/MM/yyyy` or `yyyy-MM-dd` (a leading date of an ISO string is accepted too, so a date
 * cell that Excel handed over as `2026-09-05T00:00:00.000Z` works). Null when the text is not a
 * real calendar date, e.g. 31/02/2026.
 */
export const parseCalendarDate = (text: string): CalendarDate | null => {
  const value = text.trim();
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  const ymd = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(value);
  const parts = dmy
    ? { year: dmy[3], month: dmy[2], day: dmy[1] }
    : ymd
      ? { year: ymd[1], month: ymd[2], day: ymd[3] }
      : null;
  if (!parts) return null;
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const probe = new Date(Date.UTC(year, month - 1, day));
  const real =
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day;
  return real ? { year, month, day } : null;
};

/** 00:00:00.000 of that day in Vietnam. */
export const startOfVnDay = ({ year, month, day }: CalendarDate): Date =>
  new Date(`${pad(year, 4)}-${pad(month)}-${pad(day)}T00:00:00.000${VN_OFFSET}`);

/** 23:59:59.999 of that day in Vietnam, so a semester's last day is a whole day. */
export const endOfVnDay = ({ year, month, day }: CalendarDate): Date =>
  new Date(`${pad(year, 4)}-${pad(month)}-${pad(day)}T23:59:59.999${VN_OFFSET}`);

/** `dd/MM/yyyy` of the instant as seen in Vietnam; empty when there is no date. */
export const formatVnDate = (date: Date | null | undefined): string => {
  if (!date) return '';
  const parts = DATE_FORMATTER.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${part('day')}/${part('month')}/${part('year')}`;
};
