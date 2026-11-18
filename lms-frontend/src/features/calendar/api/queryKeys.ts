export const calendarKeys = {
  all: ['calendar'] as const,
  range: (from: string, to: string) =>
    [...calendarKeys.all, 'events', from, to] as const,
};