import type { GradeColumn } from '../types/gradebook.types';

export const FAIL_THRESHOLD = 5;

export const formatScore = (value: number | null | undefined): string =>
  value === null || value === undefined ? '--' : (Math.round(value * 10) / 10).toFixed(1);

export const isLowScore = (value: number | null | undefined): boolean =>
  value !== null && value !== undefined && value < FAIL_THRESHOLD;

export interface SectionGroup {
  sectionId: string;
  sectionName: string;
  columns: GradeColumn[];
}

export const groupColumnsBySection = (columns: GradeColumn[]): SectionGroup[] => {
  const groups: SectionGroup[] = [];
  for (const column of columns) {
    const last = groups[groups.length - 1];
    if (last && last.sectionId === column.sectionId) last.columns.push(column);
    else
      groups.push({
        sectionId: column.sectionId,
        sectionName: column.sectionName,
        columns: [column],
      });
  }
  return groups;
};