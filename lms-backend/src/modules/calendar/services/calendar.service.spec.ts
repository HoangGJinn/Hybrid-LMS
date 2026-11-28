import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import type { AcademicFacade } from '../../academic/index.js';
import {
  AssignmentStatus,
  type AssignmentFacade,
  type AssignmentSummary,
} from '../../assignment/index.js';
import {
  ExamStatus,
  type ExamFacade,
  type StudentExamSummaryView,
} from '../../exam/index.js';
import { CalendarEventType } from '../types/calendar-event-view.type.js';
import { CalendarService } from './calendar.service.js';

type Mock = ReturnType<typeof vi.fn>;

const student = {
  id: 'stu-1',
  role: Role.STUDENT,
} as unknown as AuthenticatedUser;

const buildAssignment = (
  overrides: Partial<AssignmentSummary> = {},
): AssignmentSummary =>
  ({
    id: 'asg-1',
    classId: 'class-1',
    title: 'Lab 1',
    openAt: new Date('2026-11-01T00:00:00Z'),
    endAt: new Date('2026-11-10T16:59:00Z'),
    status: AssignmentStatus.OPEN,
    ...overrides,
  }) as AssignmentSummary;

const buildExam = (
  overrides: Partial<StudentExamSummaryView> = {},
): StudentExamSummaryView =>
  ({
    id: 'exam-1',
    classId: 'class-1',
    examName: 'Midterm',
    startTime: new Date('2026-11-05T01:00:00Z'),
    endTime: new Date('2026-11-05T02:30:00Z'),
    durationMinutes: 60,
    status: ExamStatus.UPCOMING,
    attemptsUsed: 0,
    ...overrides,
  }) as StudentExamSummaryView;

describe('CalendarService.listMyEvents', () => {
  let service: CalendarService;
  let academicFacade: { getClassesByStudent: Mock };
  let assignmentFacade: { getAssignmentsOfStudent: Mock };
  let examFacade: { getExamsOfStudent: Mock };

  beforeEach(() => {
    academicFacade = {
      getClassesByStudent: vi
        .fn()
        .mockResolvedValue([
          {
            id: 'class-1',
            classCode: 'SE104.Q11',
            name: 'Software Engineering',
          },
        ]),
    };
    assignmentFacade = {
      getAssignmentsOfStudent: vi.fn().mockResolvedValue([buildAssignment()]),
    };
    examFacade = {
      getExamsOfStudent: vi.fn().mockResolvedValue([buildExam()]),
    };
    service = new CalendarService(
      academicFacade as unknown as AcademicFacade,
      assignmentFacade as unknown as AssignmentFacade,
      examFacade as unknown as ExamFacade,
    );
  });

  it('should place an assignment on its deadline and an exam on its start time', async () => {
    const actualEvents = await service.listMyEvents(student, {});

    const actualAssignment = actualEvents.find(
      (e) => e.type === CalendarEventType.ASSIGNMENT,
    );
    const actualExam = actualEvents.find(
      (e) => e.type === CalendarEventType.EXAM,
    );
    expect(actualAssignment?.occursAt).toEqual(
      new Date('2026-11-10T16:59:00Z'),
    );
    expect(actualExam?.occursAt).toEqual(new Date('2026-11-05T01:00:00Z'));
    expect(actualExam?.durationMinutes).toBe(60);
    expect(actualAssignment?.durationMinutes).toBeNull();
  });

  it('should return events earliest first', async () => {
    const actualEvents = await service.listMyEvents(student, {});

    expect(actualEvents.map((e) => e.id)).toEqual([
      'EXAM:exam-1',
      'ASSIGNMENT:asg-1',
    ]);
  });

  it('should attach the class code and name', async () => {
    const [actualFirst] = await service.listMyEvents(student, {});

    expect(actualFirst.classCode).toBe('SE104.Q11');
    expect(actualFirst.className).toBe('Software Engineering');
  });

  it('should leave class fields empty when the class is unknown', async () => {
    academicFacade.getClassesByStudent.mockResolvedValue([]);

    const [actualFirst] = await service.listMyEvents(student, {});

    expect(actualFirst.classCode).toBe('');
    expect(actualFirst.className).toBe('');
  });

  it('should keep only events inside [from, to)', async () => {
    const actualEvents = await service.listMyEvents(student, {
      from: '2026-11-05T01:00:00Z',
      to: '2026-11-10T16:59:00Z',
    });

    expect(actualEvents.map((e) => e.id)).toEqual(['EXAM:exam-1']);
  });

  it('should accept a range with only one bound', async () => {
    const actualEvents = await service.listMyEvents(student, {
      from: '2026-11-06T00:00:00Z',
    });

    expect(actualEvents.map((e) => e.id)).toEqual(['ASSIGNMENT:asg-1']);
  });

  it.each([AssignmentStatus.SUBMITTED, AssignmentStatus.GRADED])(
    'should mark a %s assignment as done',
    async (status) => {
      assignmentFacade.getAssignmentsOfStudent.mockResolvedValue([
        buildAssignment({ status }),
      ]);

      const actualEvents = await service.listMyEvents(student, {});

      expect(actualEvents.find((e) => e.sourceId === 'asg-1')?.isDone).toBe(
        true,
      );
    },
  );

  it.each([
    AssignmentStatus.OPEN,
    AssignmentStatus.OVERDUE,
    AssignmentStatus.UPCOMING,
  ])('should not mark a %s assignment as done', async (status) => {
    assignmentFacade.getAssignmentsOfStudent.mockResolvedValue([
      buildAssignment({ status }),
    ]);

    const actualEvents = await service.listMyEvents(student, {});

    expect(actualEvents.find((e) => e.sourceId === 'asg-1')?.isDone).toBe(
      false,
    );
  });

  it('should mark an exam as done once the student has an attempt', async () => {
    examFacade.getExamsOfStudent.mockResolvedValue([
      buildExam({ attemptsUsed: 1 }),
    ]);

    const actualEvents = await service.listMyEvents(student, {});

    expect(actualEvents.find((e) => e.sourceId === 'exam-1')?.isDone).toBe(
      true,
    );
  });

  it('should reject a range whose start is not before its end', async () => {
    await expect(
      service.listMyEvents(student, {
        from: '2026-11-10T00:00:00Z',
        to: '2026-11-10T00:00:00Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(assignmentFacade.getAssignmentsOfStudent).not.toHaveBeenCalled();
  });
});