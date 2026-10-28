import type { ParticipantView } from '../types/participant-management.types';
import { getInitial, splitName } from './vietnamese-name';

export interface ParticipantFilters {
  query: string;
  /** Initial of the given name ("Tên đệm và tên"); '' = all. */
  given: string;
  /** Initial of the family name ("Họ"); '' = all. */
  family: string;
}

export const EMPTY_FILTERS: ParticipantFilters = {
  query: '',
  given: '',
  family: '',
};

export const isFiltered = (filters: ParticipantFilters): boolean =>
  filters.query !== '' || filters.given !== '' || filters.family !== '';

export const filterParticipants = (
  participants: ParticipantView[],
  filters: ParticipantFilters,
): ParticipantView[] => {
  const term = filters.query.trim().toLowerCase();
  return participants.filter((participant) => {
    const { family, given } = splitName(participant.fullName);
    return (
      (filters.given === '' || getInitial(given) === filters.given) &&
      (filters.family === '' || getInitial(family) === filters.family) &&
      (term === '' ||
        participant.fullName.toLowerCase().includes(term) ||
        participant.studentCode.toLowerCase().includes(term) ||
        participant.email.toLowerCase().includes(term))
    );
  });
};
