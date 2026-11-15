import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import type { SubmissionReviewService } from '../services/submission-review.service.js';
import { MyAssignmentsController } from './my-assignments.controller.js';

type Mock = ReturnType<typeof vi.fn>;

const user = { id: 'u-1', role: Role.STUDENT } as unknown as AuthenticatedUser;

describe('MyAssignmentsController', () => {
  let controller: MyAssignmentsController;
  let reviewService: Record<keyof SubmissionReviewService, Mock>;

  beforeEach(() => {
    reviewService = {
      myAssignments: vi.fn().mockResolvedValue([{ id: 'a-1' }]),
      mySubmissions: vi.fn().mockResolvedValue([{ id: 's-1' }]),
      list: vi.fn(),
      lecturerQueue: vi.fn().mockResolvedValue([{ id: 'q-1' }]),
      grade: vi.fn(),
      streamZip: vi.fn(),
    };
    controller = new MyAssignmentsController(
      reviewService as unknown as SubmissionReviewService,
    );
  });

  it('delegates student assignments/submissions and filters valid UUID classIds for lecturerQueue', async () => {
    expect(await controller.myAssignments(user)).toEqual([{ id: 'a-1' }]);
    expect(await controller.mySubmissions(user)).toEqual([{ id: 's-1' }]);

    const validUuid = '11111111-1111-4111-8111-111111111111';
    expect(
      await controller.lecturerQueue(user, `${validUuid},not-a-uuid, `),
    ).toEqual([{ id: 'q-1' }]);
    expect(reviewService.lecturerQueue).toHaveBeenCalledWith([validUuid], user);

    await controller.lecturerQueue(user);
    expect(reviewService.lecturerQueue).toHaveBeenLastCalledWith([], user);
  });
});

