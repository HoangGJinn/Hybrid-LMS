import { describe, it, expect } from 'vitest';
import { StudentSummary } from './student-summary.type.js';
import { Student } from '../entities/student.entity.js';
import { StudentStatus } from '../enums/student-status.enum.js';

describe('StudentSummary', () => {
  const makeStudent = (
    status: StudentStatus,
    isActive: boolean,
  ): Student =>
    ({
      userId: 'usr-1',
      studentCode: 'SV26000001',
      status,
      user: { fullName: 'Nguyen Van A', email: 'a@school.edu.vn', isActive },
    }) as Student;

  it('can enrol an active student who is studying', () => {
    const summary = StudentSummary.fromEntity(
      makeStudent(StudentStatus.STUDYING, true),
    );

    expect(summary).toMatchObject({
      userId: 'usr-1',
      studentCode: 'SV26000001',
      fullName: 'Nguyen Van A',
      email: 'a@school.edu.vn',
      isActive: true,
      status: StudentStatus.STUDYING,
      enrollmentBlockedReason: null,
    });
  });

  it('blocks a deactivated account', () => {
    const summary = StudentSummary.fromEntity(
      makeStudent(StudentStatus.STUDYING, false),
    );

    expect(summary.enrollmentBlockedReason).toBe(
      'The student account is deactivated',
    );
  });

  it('blocks a student who is no longer studying and names the status', () => {
    const status = Object.values(StudentStatus).find(
      (value) => value !== StudentStatus.STUDYING,
    );
    if (status === undefined) throw new Error('StudentStatus has one value');

    const summary = StudentSummary.fromEntity(makeStudent(status, true));

    expect(summary.enrollmentBlockedReason).toBe(
      `The student is not currently studying (status: ${status})`,
    );
  });
});
