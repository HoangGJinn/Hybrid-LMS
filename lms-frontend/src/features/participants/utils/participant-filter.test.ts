import { describe, expect, it } from 'vitest';
import type { ParticipantView } from '../types/participant-management.types';
import {
  EMPTY_FILTERS,
  filterParticipants,
  isFiltered,
} from './participant-filter';

const make = (overrides: Partial<ParticipantView>): ParticipantView => ({
  studentId: 'id',
  studentCode: 'SE000001',
  fullName: 'Nguyễn Văn An',
  email: 'an@example.com',
  status: 'STUDYING',
  isActive: true,
  joinedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const students = [
  make({ studentId: '1', studentCode: 'SE000001', fullName: 'Nguyễn Văn An', email: 'an@example.com' }),
  make({ studentId: '2', studentCode: 'SE000002', fullName: 'Trần Thị Bình', email: 'binh@example.com' }),
  make({ studentId: '3', studentCode: 'SE000003', fullName: 'Lê Đức Anh', email: 'anh@example.com', isActive: false }),
];

describe('filterParticipants', () => {
  it('returns everyone without filters', () => {
    expect(filterParticipants(students, EMPTY_FILTERS)).toHaveLength(3);
  });

  it('searches name, code and email, ignoring case', () => {
    const ids = (query: string) =>
      filterParticipants(students, { ...EMPTY_FILTERS, query }).map((s) => s.studentId);
    expect(ids('BÌNH')).toEqual(['2']);
    expect(ids('se000003')).toEqual(['3']);
    expect(ids('anh@')).toEqual(['3']);
  });

  it('filters by the initial of the given and family name', () => {
    // `given` = everything after the family name, so "Văn An" starts with V.
    const byGiven = filterParticipants(students, { ...EMPTY_FILTERS, given: 'Đ' });
    expect(byGiven.map((s) => s.studentId)).toEqual(['3']);
    const byFamily = filterParticipants(students, { ...EMPTY_FILTERS, family: 'L' });
    expect(byFamily.map((s) => s.studentId)).toEqual(['3']);
  });

  it('keeps deactivated accounts in the list', () => {
    expect(filterParticipants(students, EMPTY_FILTERS).some((s) => !s.isActive)).toBe(true);
  });
});

describe('isFiltered', () => {
  it('is false only for the empty filters', () => {
    expect(isFiltered(EMPTY_FILTERS)).toBe(false);
    expect(isFiltered({ ...EMPTY_FILTERS, given: 'A' })).toBe(true);
  });
});
