import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import type { ExamGradingService } from '../services/exam-grading.service.js';
import { LecturerExamController } from './lecturer-exam.controller.js';

type Mock = ReturnType<typeof vi.fn>;

const lecturer = {
  id: 'lec-1',
  role: Role.LECTURER,
} as unknown as AuthenticatedUser;

describe('LecturerExamController', () => {
  let controller: LecturerExamController;
  let examGradingService: { getLecturerQueue: Mock };

  beforeEach(() => {
    examGradingService = {
      getLecturerQueue: vi.fn().mockResolvedValue([{ sessionId: 'sess-1' }]),
    };
    controller = new LecturerExamController(
      examGradingService as unknown as ExamGradingService,
    );
  });

  it('filters invalid classIds and passes valid UUIDs to getLecturerQueue', async () => {
    const uuid = '11111111-1111-4111-8111-111111111111';
    const result = await controller.lecturerQueue(
      lecturer,
      `${uuid},invalid-id,`,
    );

    expect(result).toEqual([{ sessionId: 'sess-1' }]);
    expect(examGradingService.getLecturerQueue).toHaveBeenCalledWith(
      [uuid],
      lecturer,
    );

    await controller.lecturerQueue(lecturer);
    expect(examGradingService.getLecturerQueue).toHaveBeenLastCalledWith(
      [],
      lecturer,
    );
  });
});

