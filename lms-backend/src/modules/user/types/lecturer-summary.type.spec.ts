import { describe, expect, it } from 'vitest';
import { Lecturer } from '../entities/lecturer.entity.js';
import { LecturerStatus } from '../enums/lecturer-status.enum.js';
import { LecturerSummary } from './lecturer-summary.type.js';

describe('LecturerSummary', () => {
  const makeLecturer = (
    status: LecturerStatus,
    isActive: boolean,
    deletedAt: Date | null = null,
  ): Lecturer =>
    ({
      userId: 'usr-1',
      lecturerCode: 'GV26000001',
      status,
      user: {
        fullName: 'Tran Van B',
        email: 'b@school.edu.vn',
        isActive,
        deletedAt,
      },
    }) as Lecturer;

  it('can be given a class when the account is active and the lecturer is working', () => {
    const summary = LecturerSummary.fromEntity(makeLecturer(LecturerStatus.WORKING, true));

    expect(summary).toMatchObject({
      userId: 'usr-1',
      lecturerCode: 'GV26000001',
      fullName: 'Tran Van B',
      email: 'b@school.edu.vn',
      assignmentBlockedReason: null,
    });
  });

  it('blocks a deactivated account', () => {
    const summary = LecturerSummary.fromEntity(makeLecturer(LecturerStatus.WORKING, false));
    expect(summary.assignmentBlockedReason).toBe('The lecturer account is deactivated');
  });

  it('blocks a permanently removed account', () => {
    const summary = LecturerSummary.fromEntity(
      makeLecturer(LecturerStatus.WORKING, false, new Date()),
    );
    expect(summary.assignmentBlockedReason).toBe(
      'The lecturer account has been permanently removed',
    );
  });

  it.each([LecturerStatus.RESIGNED, LecturerStatus.ON_LEAVE])(
    'blocks a lecturer whose status is %s',
    (status) => {
      const summary = LecturerSummary.fromEntity(makeLecturer(status, true));
      expect(summary.assignmentBlockedReason).toBe(
        `The lecturer is not currently working (status: ${status})`,
      );
    },
  );
});