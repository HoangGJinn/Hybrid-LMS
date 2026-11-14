import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import type { ExamGradingService } from '../services/exam-grading.service.js';
import type { ExamService } from '../services/exam.service.js';
import { ExamController } from './exam.controller.js';

type Mock = ReturnType<typeof vi.fn>;

const CLASS_ID = '11111111-1111-1111-1111-111111111111';
const EXAM_ID = '22222222-2222-2222-2222-222222222222';
const SESSION_ID = '33333333-3333-3333-3333-333333333333';

const user = { id: 'lec-1', role: Role.LECTURER } as unknown as AuthenticatedUser;

describe('ExamController', () => {
  let controller: ExamController;
  let examService: {
    create: Mock;
    findOne: Mock;
    update: Mock;
    updateSchedule: Mock;
    remove: Mock;
  };
  let examGradingService: {
    getResults: Mock;
    streamSubmissionsZip: Mock;
    reviewSession: Mock;
    gradeSession: Mock;
  };

  beforeEach(() => {
    examService = {
      create: vi.fn().mockResolvedValue({ id: EXAM_ID }),
      findOne: vi.fn().mockResolvedValue({ id: EXAM_ID }),
      update: vi.fn().mockResolvedValue({ id: EXAM_ID }),
      updateSchedule: vi.fn().mockResolvedValue({ id: EXAM_ID }),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    examGradingService = {
      getResults: vi.fn().mockResolvedValue({ examId: EXAM_ID }),
      streamSubmissionsZip: vi.fn().mockResolvedValue(undefined),
      reviewSession: vi.fn().mockResolvedValue({ sessionId: SESSION_ID }),
      gradeSession: vi.fn().mockResolvedValue({ sessionId: SESSION_ID, score: 8 }),
    };

    controller = new ExamController(
      examService as unknown as ExamService,
      examGradingService as unknown as ExamGradingService,
    );
  });

  it('delegates CRUD, grading, review, and archive endpoints to services', async () => {
    const createDto = { examName: 'Midterm' } as never;
    expect(await controller.create(CLASS_ID, createDto, user)).toEqual({
      id: EXAM_ID,
    });
    expect(examService.create).toHaveBeenCalledWith(CLASS_ID, createDto, user);

    expect(await controller.getResults(CLASS_ID, EXAM_ID, user)).toEqual({
      examId: EXAM_ID,
    });

    const response = {} as Response;
    await controller.downloadSubmissions(
      CLASS_ID,
      EXAM_ID,
      SESSION_ID,
      user,
      response,
    );
    expect(examGradingService.streamSubmissionsZip).toHaveBeenCalledWith(
      CLASS_ID,
      EXAM_ID,
      SESSION_ID,
      user,
      response,
    );

    expect(
      await controller.reviewSession(CLASS_ID, EXAM_ID, SESSION_ID, user),
    ).toEqual({ sessionId: SESSION_ID });

    const gradeDto = { score: 8 } as never;
    expect(
      await controller.gradeSession(
        CLASS_ID,
        EXAM_ID,
        SESSION_ID,
        gradeDto,
        user,
      ),
    ).toEqual({ sessionId: SESSION_ID, score: 8 });

    expect(await controller.findOne(CLASS_ID, EXAM_ID, user)).toEqual({
      id: EXAM_ID,
    });

    const updateDto = { examName: 'Final' } as never;
    expect(await controller.update(CLASS_ID, EXAM_ID, updateDto, user)).toEqual(
      { id: EXAM_ID },
    );

    const scheduleDto = { startTime: '2026-11-20T00:00:00Z' } as never;
    expect(
      await controller.updateSchedule(CLASS_ID, EXAM_ID, scheduleDto, user),
    ).toEqual({ id: EXAM_ID });

    await controller.remove(CLASS_ID, EXAM_ID, user);
    expect(examService.remove).toHaveBeenCalledWith(CLASS_ID, EXAM_ID, user);
  });
});

