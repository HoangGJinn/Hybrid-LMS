import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import type { AssignmentService } from '../services/assignment.service.js';
import type { SubmissionReviewService } from '../services/submission-review.service.js';
import type { SubmissionService } from '../services/submission.service.js';
import { AssignmentController } from './assignment.controller.js';

type Mock = ReturnType<typeof vi.fn>;

const CLASS_ID = '11111111-1111-1111-1111-111111111111';
const ASSIGNMENT_ID = '22222222-2222-2222-2222-222222222222';
const SUBMISSION_ID = '33333333-3333-3333-3333-333333333333';

const user = { id: 'u-1', role: Role.LECTURER } as unknown as AuthenticatedUser;

describe('AssignmentController', () => {
  let controller: AssignmentController;
  let assignmentService: Record<keyof AssignmentService, Mock>;
  let submissionService: Record<keyof SubmissionService, Mock>;
  let reviewService: Record<keyof SubmissionReviewService, Mock>;

  beforeEach(() => {
    assignmentService = {
      create: vi.fn().mockResolvedValue({ id: ASSIGNMENT_ID }),
      findOne: vi.fn().mockResolvedValue({ id: ASSIGNMENT_ID }),
      update: vi.fn().mockResolvedValue({ id: ASSIGNMENT_ID }),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    submissionService = {
      submit: vi.fn().mockResolvedValue({ id: SUBMISSION_ID }),
      findViewByStudent: vi.fn(),
      count: vi.fn(),
    };
    reviewService = {
      myAssignments: vi.fn(),
      mySubmissions: vi.fn(),
      list: vi.fn().mockResolvedValue([{ id: SUBMISSION_ID }]),
      lecturerQueue: vi.fn(),
      grade: vi.fn().mockResolvedValue({ id: SUBMISSION_ID, score: 9 }),
      streamZip: vi.fn().mockResolvedValue(undefined),
    };

    controller = new AssignmentController(
      assignmentService as unknown as AssignmentService,
      submissionService as unknown as SubmissionService,
      reviewService as unknown as SubmissionReviewService,
    );
  });

  it('delegates CRUD, submit, list, download, and grade endpoints to services', async () => {
    expect(controller.getTest()).toBe('Assignment module is working');

    const createDto = { title: 'A1' } as never;
    expect(await controller.create(CLASS_ID, createDto, user)).toEqual({
      id: ASSIGNMENT_ID,
    });
    expect(assignmentService.create).toHaveBeenCalledWith(
      CLASS_ID,
      createDto,
      user,
    );

    expect(await controller.findOne(CLASS_ID, ASSIGNMENT_ID, user)).toEqual({
      id: ASSIGNMENT_ID,
    });
    expect(assignmentService.findOne).toHaveBeenCalledWith(
      CLASS_ID,
      ASSIGNMENT_ID,
      user,
    );

    const updateDto = { title: 'A2' } as never;
    expect(
      await controller.update(CLASS_ID, ASSIGNMENT_ID, updateDto, user),
    ).toEqual({ id: ASSIGNMENT_ID });
    expect(assignmentService.update).toHaveBeenCalledWith(
      CLASS_ID,
      ASSIGNMENT_ID,
      updateDto,
      user,
    );

    await controller.remove(CLASS_ID, ASSIGNMENT_ID, user);
    expect(assignmentService.remove).toHaveBeenCalledWith(
      CLASS_ID,
      ASSIGNMENT_ID,
      user,
    );

    const submitDto = { fileIds: ['f-1'] } as never;
    expect(
      await controller.submit(CLASS_ID, ASSIGNMENT_ID, submitDto, user),
    ).toEqual({ id: SUBMISSION_ID });
    expect(submissionService.submit).toHaveBeenCalledWith(
      CLASS_ID,
      ASSIGNMENT_ID,
      submitDto,
      user,
    );

    expect(
      await controller.listSubmissions(CLASS_ID, ASSIGNMENT_ID, user),
    ).toEqual([{ id: SUBMISSION_ID }]);

    const response = {} as Response;
    await controller.downloadSubmissions(
      CLASS_ID,
      ASSIGNMENT_ID,
      SUBMISSION_ID,
      user,
      response,
    );
    expect(reviewService.streamZip).toHaveBeenCalledWith(
      CLASS_ID,
      ASSIGNMENT_ID,
      SUBMISSION_ID,
      user,
      response,
    );

    const gradeDto = { score: 9 } as never;
    expect(
      await controller.gradeSubmission(
        CLASS_ID,
        ASSIGNMENT_ID,
        SUBMISSION_ID,
        gradeDto,
        user,
      ),
    ).toEqual({ id: SUBMISSION_ID, score: 9 });
  });
});

