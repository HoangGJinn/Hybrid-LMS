import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import type { StudentExamService } from '../services/student-exam.service.js';
import { StudentExamController } from './student-exam.controller.js';

type Mock = ReturnType<typeof vi.fn>;

const CLASS_ID = '11111111-1111-1111-1111-111111111111';
const EXAM_ID = '22222222-2222-2222-2222-222222222222';
const SESSION_ID = '33333333-3333-3333-3333-333333333333';

const student = { id: 'stu-1', role: Role.STUDENT } as unknown as AuthenticatedUser;

describe('StudentExamController', () => {
  let controller: StudentExamController;
  let studentExamService: {
    myExams: Mock;
    getLobby: Mock;
    startOrResume: Mock;
    saveAnswers: Mock;
    saveFileSubmission: Mock;
    submit: Mock;
    review: Mock;
  };

  beforeEach(() => {
    studentExamService = {
      myExams: vi.fn().mockResolvedValue([{ examId: EXAM_ID }]),
      getLobby: vi.fn().mockResolvedValue({ examId: EXAM_ID }),
      startOrResume: vi.fn().mockResolvedValue({ sessionId: SESSION_ID }),
      saveAnswers: vi.fn().mockResolvedValue({ savedCount: 2 }),
      saveFileSubmission: vi.fn().mockResolvedValue({ files: [] }),
      submit: vi.fn().mockResolvedValue({ sessionId: SESSION_ID }),
      review: vi.fn().mockResolvedValue({ sessionId: SESSION_ID }),
    };

    controller = new StudentExamController(
      studentExamService as unknown as StudentExamService,
    );
  });

  it('delegates all student exam lifecycle endpoints to StudentExamService', async () => {
    expect(await controller.myExams(student)).toEqual([{ examId: EXAM_ID }]);
    expect(await controller.getLobby(CLASS_ID, EXAM_ID, student)).toEqual({
      examId: EXAM_ID,
    });
    expect(await controller.startOrResume(CLASS_ID, EXAM_ID, student)).toEqual({
      sessionId: SESSION_ID,
    });

    const answersDto = { answers: [] } as never;
    expect(
      await controller.saveAnswers(SESSION_ID, answersDto, student),
    ).toEqual({ savedCount: 2 });

    const fileDto = { fileIds: ['f-1'] } as never;
    expect(
      await controller.saveFileSubmission(SESSION_ID, fileDto, student),
    ).toEqual({ files: [] });

    const submitDto = { answers: [] } as never;
    expect(await controller.submit(SESSION_ID, submitDto, student)).toEqual({
      sessionId: SESSION_ID,
    });

    expect(await controller.review(SESSION_ID, student)).toEqual({
      sessionId: SESSION_ID,
    });
  });
});

