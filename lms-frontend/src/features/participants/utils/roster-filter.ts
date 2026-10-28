import type { RosterStudent } from '../types/participants.types';
import { getInitial, splitName } from './vietnamese-name';

export type StatusFilter = 'all' | 'at-risk' | 'on-track';

export interface RosterFilters {
  query: string;
  status: StatusFilter;
  /** Initial of the given name ("Tên đệm và tên"); '' = all. */
  given: string;
  /** Initial of the family name ("Họ"); '' = all. */
  family: string;
}

export const EMPTY_FILTERS: RosterFilters = {
  query: '',
  status: 'all',
  given: '',
  family: '',
};

export const filterRoster = (
  students: RosterStudent[],
  filters: RosterFilters,
): RosterStudent[] => {
  const term = filters.query.trim().toLowerCase();
  return students.filter((student) => {
    const { family, given } = splitName(student.fullName);
    return (
      (filters.status === 'all' || (filters.status === 'at-risk') === student.atRisk) &&
      (filters.given === '' || getInitial(given) === filters.given) &&
      (filters.family === '' || getInitial(family) === filters.family) &&
      (term === '' ||
        student.fullName.toLowerCase().includes(term) ||
        student.studentCode.toLowerCase().includes(term) ||
        student.email.toLowerCase().includes(term))
    );
  });
};