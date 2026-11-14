import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import type { AcademicFacade } from '../../academic/facades/academic.facade.js';
import type { ContentFacade } from '../../content/facades/content.facade.js';
import type { FileFacade } from '../../../shared/file/facades/file.facade.js';
import type { ExamSchedule } from '../entities/exam-schedule.entity.js';
import type { ExamSession } from '../entities/exam-session.entity.js';
import { ExamFormat } from '../enums/exam-format.enum.js';
import { ExamSessionStatus } from '../enums/exam-session-status.enum.js';
import type {
  ExamContent,
  ExamRepository,
} from '../repositories/exam.repository.js';
import type { ExamSessionRepository } from '../repositories/exam-session.repository.js';
import { StudentExamService } from './student-exam.service.js';

type Mock = ReturnType<typeof vi.fn>;

const CLASS_ID = 'class-1';
const EXAM_ID = 'exam-1';
const STUDENT_ID = 'stu-1';
const NOW = new Date('2026-11-12T08:30:00Z');
const student = {
  id: STUDENT_ID,
  role: Role.STUDENT,
} as unknown as AuthenticatedUser;

const buildExam = (overrides: Partial<ExamSchedule> = {}): ExamSchedule =>
  ({
    id: EXAM_ID,
    classId: CLASS_ID,
    examName: 'Midterm Exam',
    startTime: new Date('2026-11-12T08:00:00Z'),
    endTime: new Date('2026-11-12T10:00:00Z'),
    durationMinutes: 45,
    format: ExamFormat.MULTIPLE_CHOICE,
    fileQuestionId: null,
    maxAttempts: 2,
    showResults: true,
    shuffleQuestions: false,
    shuffleOptions: false,
    ...overrides,
  }) as ExamSchedule;

const buildSession = (overrides: Partial<ExamSession> = {}): ExamSession =>
  ({
    id: 'session-1',
    examScheduleId: EXAM_ID,
    studentId: STUDENT_ID,
    status: ExamSessionStatus.IN_PROGRESS,
    score: null,
    startedAt: new Date('2026-11-12T08:15:00Z'),
    endedAt: null,
    ...overrides,
  }) as ExamSession;

const buildContent = (): ExamContent => ({
  questions: [
    {
      id: 'q-1',
      examId: EXAM_ID,
      content: '2 + 2 = ?',
      orderIndex: 0,
    },
    {
      id: 'q-2',
      examId: EXAM_ID,
      content: '3 + 3 = ?',
      orderIndex: 1,
    },
  ] as ExamContent['questions'],
  optionsByQuestionId: new Map([
    [
      'q-1',
      [
        { id: 'o-1a', questionId: 'q-1', content: '3', isCorrect: false, orderIndex: 0 },
        { id: 'o-1b', questionId: 'q-1', content: '4', isCorrect: true, orderIndex: 1 },
      ] as never,
    ],
    [
      'q-2',
      [
        { id: 'o-2a', questionId: 'q-2', content: '6', isCorrect: true, orderIndex: 0 },
        { id: 'o-2b', questionId: 'q-2', content: '9', isCorrect: false, orderIndex: 1 },
      ] as never,
    ],
  ]),
});

describe('StudentExamService', () => {
  let mockExamRepo: {
    findById: Mock;
    findByIds: Mock;
    findContent: Mock;
    countQuestions: Mock;
  };
  let mockSessionRepo: {
    findById: Mock;
    findByStudentAndExam: Mock;
    findByStudentInExams: Mock;
    findByExam: Mock;
    createSession: Mock;
    findAnswers: Mock;
    saveAnswers: Mock;
    findFileIds: Mock;
    saveSessionFiles: Mock;
    finalizeSession: Mock;
  };
  let mockAcademic: {
    assertCanViewClass: Mock;
    getClassesByStudent: Mock;
  };
  let mockContent: {
    isExamInClass: Mock;
    findExamsByClasses: Mock;
  };
  let mockFileFacade: {
    getDownloadLink: Mock;
    getDownloadLinks: Mock;
    assertOwnedReadyFiles: Mock;
    deleteFiles: Mock;
  };
  let service: StudentExamService;

  beforeEach(() => {
    mockExamRepo = {
      findById: vi.fn().mockResolvedValue(buildExam()),
      findByIds: vi.fn().mockResolvedValue([buildExam()]),
      findContent: vi.fn().mockResolvedValue(buildContent()),
      countQuestions: vi.fn().mockResolvedValue(2),
    };
    mockSessionRepo = {
      findById: vi.fn().mockResolvedValue(buildSession()),
      findByStudentAndExam: vi.fn().mockResolvedValue([]),
      findByStudentInExams: vi.fn().mockResolvedValue([]),
      findByExam: vi.fn().mockResolvedValue([]),
      createSession: vi
        .fn()
        .mockImplementation(async (examScheduleId, studentId, startedAt) =>
          buildSession({ id: 'session-new', examScheduleId, studentId, startedAt }),
        ),
      findAnswers: vi.fn().mockResolvedValue(new Map([['q-1', 'o-1b']])),
      saveAnswers: vi.fn().mockResolvedValue(undefined),
      findFileIds: vi.fn().mockResolvedValue([]),
      saveSessionFiles: vi
        .fn()
        .mockImplementation(async (id, _fileIds, submittedAt) =>
          buildSession({ id, submittedAt }),
        ),
      finalizeSession: vi
        .fn()
        .mockImplementation(async (id, update) =>
          buildSession({
            id,
            status: ExamSessionStatus.COMPLETED,
            score: update.score,
            endedAt: update.endedAt,
          }),
        ),
    };
    mockAcademic = {
      assertCanViewClass: vi.fn().mockResolvedValue(undefined),
      getClassesByStudent: vi.fn().mockResolvedValue([{ id: CLASS_ID }]),
    };
    mockContent = {
      isExamInClass: vi.fn().mockResolvedValue(true),
      findExamsByClasses: vi
        .fn()
        .mockResolvedValue([{ examId: EXAM_ID, classId: CLASS_ID }]),
    };
    mockFileFacade = {
      getDownloadLink: vi.fn().mockResolvedValue({
        id: 'file-q',
        fileName: 'midterm.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        downloadUrl: 'https://s3/midterm.pdf',
      }),
      getDownloadLinks: vi.fn().mockImplementation(async (ids: string[]) =>
        ids.map((id) => ({
          id,
          fileName: `${id}.pdf`,
          fileType: 'application/pdf',
          fileSize: 2048,
          downloadUrl: `https://s3/${id}.pdf`,
        })),
      ),
      assertOwnedReadyFiles: vi.fn().mockResolvedValue(undefined),
      deleteFiles: vi.fn().mockResolvedValue(undefined),
    };
    service = new StudentExamService(
      mockExamRepo as unknown as ExamRepository,
      mockSessionRepo as unknown as ExamSessionRepository,
      mockAcademic as unknown as AcademicFacade,
      mockContent as unknown as ContentFacade,
      mockFileFacade as unknown as FileFacade,
    );
  });

  describe('myExams', () => {
    it('returns the highest score across completed attempts when showResults is enabled', async () => {
      mockSessionRepo.findByStudentInExams.mockResolvedValue([
        buildSession({
          id: 's-1',
          status: ExamSessionStatus.COMPLETED,
          score: 5,
        }),
        buildSession({
          id: 's-2',
          status: ExamSessionStatus.COMPLETED,
          score: 8.5,
        }),
      ]);

      const actual = await service.myExams(student, NOW);

      expect(actual).toHaveLength(1);
      expect(actual[0]).toMatchObject({
        id: EXAM_ID,
        attemptsUsed: 2,
        bestScore: 8.5,
        inProgressSessionId: null,
      });
    });

    it('hides bestScore when showResults is false', async () => {
      mockExamRepo.findByIds.mockResolvedValue([buildExam({ showResults: false })]);
      mockSessionRepo.findByStudentInExams.mockResolvedValue([
        buildSession({
          id: 's-1',
          status: ExamSessionStatus.COMPLETED,
          score: 9,
        }),
      ]);

      const [summary] = await service.myExams(student, NOW);

      expect(summary.bestScore).toBeNull();
    });
  });

  describe('getLobby', () => {
    it('computes canStartNewAttempt and lists attempts with bestScore', async () => {
      mockSessionRepo.findByStudentAndExam.mockResolvedValue([
        buildSession({
          id: 's-1',
          status: ExamSessionStatus.COMPLETED,
          score: 5,
          endedAt: new Date('2026-11-12T08:25:00Z'),
        }),
      ]);

      const lobby = await service.getLobby(CLASS_ID, EXAM_ID, student, NOW);

      expect(lobby).toMatchObject({
        questionCount: 2,
        attemptsUsed: 1,
        maxAttempts: 2,
        bestScore: 5,
        canStartNewAttempt: true,
        activeSessionId: null,
      });
      expect(lobby.attempts).toHaveLength(1);
    });

    it('lazily finalizes an expired IN_PROGRESS attempt when opening the lobby', async () => {
      const expiredSession = buildSession({
        id: 's-expired',
        startedAt: new Date('2026-11-12T07:00:00Z'),
      });
      mockSessionRepo.findByStudentAndExam.mockResolvedValue([expiredSession]);

      const lobby = await service.getLobby(CLASS_ID, EXAM_ID, student, NOW);

      expect(mockSessionRepo.finalizeSession).toHaveBeenCalledWith(
        's-expired',
        expect.objectContaining({ score: 5 }),
      );
      expect(lobby.attemptsUsed).toBe(1);
      expect(lobby.activeSessionId).toBeNull();
    });

    it('returns 404 when the exam is not placed in any section of the class', async () => {
      mockContent.isExamInClass.mockResolvedValue(false);

      await expect(
        service.getLobby(CLASS_ID, EXAM_ID, student, NOW),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('startOrResume', () => {
    it('creates a new attempt when none is in progress and strips isCorrect from options', async () => {
      const attempt = await service.startOrResume(CLASS_ID, EXAM_ID, student, NOW);

      expect(mockSessionRepo.createSession).toHaveBeenCalledWith(
        EXAM_ID,
        STUDENT_ID,
        NOW,
      );
      expect(attempt.session.id).toBe('session-new');
      expect(attempt.session.attemptNumber).toBe(1);
      expect(attempt.questions[0].options[0]).not.toHaveProperty('isCorrect');
    });

    it('resumes an existing IN_PROGRESS attempt with its saved answers', async () => {
      mockSessionRepo.findByStudentAndExam.mockResolvedValue([buildSession()]);

      const attempt = await service.startOrResume(CLASS_ID, EXAM_ID, student, NOW);

      expect(mockSessionRepo.createSession).not.toHaveBeenCalled();
      expect(attempt.session.id).toBe('session-1');
      expect(attempt.savedAnswers).toEqual({ 'q-1': 'o-1b' });
    });

    it('recovers gracefully when a concurrent double-click hits the unique index', async () => {
      const uniqueError = new QueryFailedError(
        'INSERT',
        [],
        Object.assign(new Error('duplicate'), { code: '23505' }),
      );
      mockSessionRepo.createSession.mockRejectedValueOnce(uniqueError);
      mockSessionRepo.findByStudentAndExam
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([buildSession({ id: 'session-concurrent' })]);

      const attempt = await service.startOrResume(CLASS_ID, EXAM_ID, student, NOW);

      expect(attempt.session.id).toBe('session-concurrent');
    });

    it('rejects starting when all allowed attempts have been used', async () => {
      mockExamRepo.findById.mockResolvedValue(buildExam({ maxAttempts: 1 }));
      mockSessionRepo.findByStudentAndExam.mockResolvedValue([
        buildSession({ status: ExamSessionStatus.COMPLETED, score: 10 }),
      ]);

      await expect(
        service.startOrResume(CLASS_ID, EXAM_ID, student, NOW),
      ).rejects.toThrow('used all allowed attempts');
    });

    it('allows unlimited retakes when maxAttempts is null', async () => {
      mockExamRepo.findById.mockResolvedValue(buildExam({ maxAttempts: null }));
      mockSessionRepo.findByStudentAndExam.mockResolvedValue([
        buildSession({ id: 's-1', status: ExamSessionStatus.COMPLETED, score: 5 }),
        buildSession({ id: 's-2', status: ExamSessionStatus.COMPLETED, score: 10 }),
      ]);

      const attempt = await service.startOrResume(CLASS_ID, EXAM_ID, student, NOW);

      expect(attempt.session.attemptNumber).toBe(3);
    });
  });

  describe('saveAnswers', () => {
    it('saves valid answers and returns the current deadline', async () => {
      const result = await service.saveAnswers(
        'session-1',
        { answers: [{ questionId: 'q-1', optionId: 'o-1b' }] },
        student,
        NOW,
      );

      expect(mockSessionRepo.saveAnswers).toHaveBeenCalledWith(
        'session-1',
        [{ questionId: 'q-1', optionId: 'o-1b' }],
        NOW,
      );
      expect(result.savedQuestionIds).toEqual(['q-1']);
      expect(result.deadline).toEqual(new Date('2026-11-12T09:00:00Z'));
    });

    it('rejects an option that does not belong to the given question', async () => {
      await expect(
        service.saveAnswers(
          'session-1',
          { answers: [{ questionId: 'q-1', optionId: 'o-2a' }] },
          student,
          NOW,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockSessionRepo.saveAnswers).not.toHaveBeenCalled();
    });

    it('auto-finalizes and throws ConflictException when saving after the grace period', async () => {
      const afterGrace = new Date('2026-11-12T09:00:31Z');

      await expect(
        service.saveAnswers(
          'session-1',
          { answers: [{ questionId: 'q-1', optionId: 'o-1b' }] },
          student,
          afterGrace,
        ),
      ).rejects.toThrow('Time is up; your attempt has been submitted automatically');
      expect(mockSessionRepo.finalizeSession).toHaveBeenCalled();
    });
  });

  describe('submit', () => {
    it('saves final answers, grades on a 10-point scale, and marks the attempt COMPLETED', async () => {
      mockSessionRepo.findAnswers.mockResolvedValue(
        new Map([
          ['q-1', 'o-1b'],
          ['q-2', 'o-2a'],
        ]),
      );

      const result = await service.submit(
        'session-1',
        { answers: [{ questionId: 'q-2', optionId: 'o-2a' }] },
        student,
        NOW,
      );

      expect(mockSessionRepo.saveAnswers).toHaveBeenCalled();
      expect(result).toMatchObject({
        status: ExamSessionStatus.COMPLETED,
        score: 10,
        correctCount: 2,
        totalQuestions: 2,
      });
    });
  });

  describe('review', () => {
    it('returns full questions with selectedOptionId and isCorrect when showResults is true', async () => {
      const completed = buildSession({
        status: ExamSessionStatus.COMPLETED,
        score: 5,
        endedAt: NOW,
      });
      mockSessionRepo.findById.mockResolvedValue(completed);
      mockSessionRepo.findByStudentAndExam.mockResolvedValue([completed]);

      const review = await service.review('session-1', student, NOW);

      expect(review.score).toBe(5);
      expect(review.correctCount).toBe(1);
      expect(review.questions[0]).toMatchObject({
        id: 'q-1',
        selectedOptionId: 'o-1b',
      });
      expect(review.questions[0].options[1]).toMatchObject({
        id: 'o-1b',
        isCorrect: true,
      });
    });

    it('throws ForbiddenException when showResults is false', async () => {
      const completed = buildSession({
        status: ExamSessionStatus.COMPLETED,
        score: 5,
        endedAt: NOW,
      });
      mockExamRepo.findById.mockResolvedValue(buildExam({ showResults: false }));
      mockSessionRepo.findById.mockResolvedValue(completed);
      mockSessionRepo.findByStudentAndExam.mockResolvedValue([completed]);

      await expect(service.review('session-1', student, NOW)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('FILE exam flow (start, submit & update within remaining time)', () => {
    it('starts a FILE exam attempt and returns the lecturer question file', async () => {
      mockExamRepo.findById.mockResolvedValue(
        buildExam({ format: ExamFormat.FILE, fileQuestionId: 'file-q' }),
      );

      const attempt = await service.startOrResume(CLASS_ID, EXAM_ID, student, NOW);

      expect(attempt.exam.format).toBe(ExamFormat.FILE);
      expect(attempt.questionFile).toMatchObject({
        id: 'file-q',
        fileName: 'midterm.pdf',
      });
      expect(attempt.submittedFiles).toEqual([]);
    });

    it('allows submitting files at minute 15 and replacing/updating them at minute 25 while timer remains', async () => {
      const fileExam = buildExam({
        format: ExamFormat.FILE,
        fileQuestionId: 'file-q',
        durationMinutes: 45,
      });
      mockExamRepo.findById.mockResolvedValue(fileExam);
      // Started at 08:15, deadline is 09:00
      const activeSession = buildSession({
        id: 'session-file',
        startedAt: new Date('2026-11-12T08:15:00Z'),
        submittedAt: new Date('2026-11-12T08:30:00Z'),
        gradedAt: null,
      });
      mockSessionRepo.findById.mockResolvedValue(activeSession);
      mockSessionRepo.findFileIds.mockResolvedValue(['file-old']);

      // Student updates submission at 08:40 (minute 25 of 45)
      const minute25 = new Date('2026-11-12T08:40:00Z');
      const result = await service.saveFileSubmission(
        'session-file',
        { fileIds: ['file-new-1', 'file-new-2'] },
        student,
        minute25,
      );

      expect(mockFileFacade.assertOwnedReadyFiles).toHaveBeenCalledWith(
        ['file-new-1', 'file-new-2'],
        STUDENT_ID,
      );
      expect(mockSessionRepo.saveSessionFiles).toHaveBeenCalledWith(
        'session-file',
        ['file-new-1', 'file-new-2'],
        minute25,
      );
      expect(mockFileFacade.deleteFiles).toHaveBeenCalledWith(['file-old']);
      expect(result.submittedFiles).toHaveLength(2);
      expect(result.submittedAt).toEqual(minute25);
    });

    it('rejects editing a FILE submission after the lecturer has already graded it', async () => {
      mockExamRepo.findById.mockResolvedValue(
        buildExam({ format: ExamFormat.FILE, fileQuestionId: 'file-q' }),
      );
      mockSessionRepo.findById.mockResolvedValue(
        buildSession({
          id: 'session-file',
          gradedAt: new Date('2026-11-12T08:25:00Z'),
          score: 8.5,
        }),
      );

      await expect(
        service.saveFileSubmission(
          'session-file',
          { fileIds: ['file-new'] },
          student,
          NOW,
        ),
      ).rejects.toThrow('This attempt can no longer be edited');
    });
  });
});
