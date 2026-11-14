import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { PassThrough, Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import type { FileFacade } from '../../../shared/file/facades/file.facade.js';
import type { AcademicFacade } from '../../academic/facades/academic.facade.js';
import type { ExamSchedule } from '../entities/exam-schedule.entity.js';
import type { ExamSession } from '../entities/exam-session.entity.js';
import { ExamFormat } from '../enums/exam-format.enum.js';
import { ExamSessionStatus } from '../enums/exam-session-status.enum.js';
import type {
  ExamContent,
  ExamRepository,
} from '../repositories/exam.repository.js';
import type { ExamSessionRepository } from '../repositories/exam-session.repository.js';
import { ExamGradingService } from './exam-grading.service.js';
import type { StudentExamService } from './student-exam.service.js';

type Mock = ReturnType<typeof vi.fn>;

const CLASS_ID = 'class-1';
const EXAM_ID = 'exam-1';
const LECTURER_ID = 'lec-1';
const NOW = new Date('2026-11-12T10:00:00Z');

const lecturer = {
  id: LECTURER_ID,
  role: Role.LECTURER,
} as unknown as AuthenticatedUser;

const buildExam = (overrides: Partial<ExamSchedule> = {}): ExamSchedule =>
  ({
    id: EXAM_ID,
    classId: CLASS_ID,
    examName: 'Final Exam',
    startTime: new Date('2026-11-12T08:00:00Z'),
    endTime: new Date('2026-11-12T09:00:00Z'),
    durationMinutes: 45,
    format: ExamFormat.MULTIPLE_CHOICE,
    fileQuestionId: null,
    maxAttempts: 2,
    showResults: false,
    shuffleQuestions: false,
    shuffleOptions: false,
    ...overrides,
  }) as ExamSchedule;

const buildSession = (overrides: Partial<ExamSession> = {}): ExamSession =>
  ({
    id: 'session-1',
    examScheduleId: EXAM_ID,
    studentId: 'stu-1',
    status: ExamSessionStatus.COMPLETED,
    score: 7.5,
    startedAt: new Date('2026-11-12T08:00:00Z'),
    endedAt: new Date('2026-11-12T08:30:00Z'),
    submittedAt: null,
    comment: null,
    gradedAt: null,
    ...overrides,
  }) as ExamSession;

const buildContent = (): ExamContent => ({
  questions: [
    {
      id: 'q-1',
      examId: EXAM_ID,
      content: 'Q1',
      orderIndex: 0,
    },
    {
      id: 'q-2',
      examId: EXAM_ID,
      content: 'Q2',
      orderIndex: 1,
    },
  ] as ExamContent['questions'],
  optionsByQuestionId: new Map([
    [
      'q-1',
      [
        { id: 'o-1a', questionId: 'q-1', content: 'A', isCorrect: true, orderIndex: 0 },
        { id: 'o-1b', questionId: 'q-1', content: 'B', isCorrect: false, orderIndex: 1 },
      ] as never,
    ],
    [
      'q-2',
      [
        { id: 'o-2a', questionId: 'q-2', content: 'A', isCorrect: false, orderIndex: 0 },
        { id: 'o-2b', questionId: 'q-2', content: 'B', isCorrect: true, orderIndex: 1 },
      ] as never,
    ],
  ]),
});

describe('ExamGradingService', () => {
  let mockExamRepo: {
    findById: Mock;
    findContent: Mock;
    findByClassIdsAndFormat: Mock;
  };
  let mockSessionRepo: {
    findById: Mock;
    findByStudentAndExam: Mock;
    findAnswers: Mock;
    findAnswersBySessions: Mock;
    findFileIds: Mock;
    findFileIdsBySessions: Mock;
    saveGrade: Mock;
  };
  let mockStudentExamService: {
    finalizeExpiredSessionsForExam: Mock;
  };
  let mockAcademic: {
    assertCanManageClass: Mock;
    getClassRoster: Mock;
  };
  let mockFileFacade: {
    getDownloadLink: Mock;
    getDownloadLinks: Mock;
    openReadStream: Mock;
  };
  let service: ExamGradingService;

  beforeEach(() => {
    mockExamRepo = {
      findById: vi.fn().mockResolvedValue(buildExam()),
      findContent: vi.fn().mockResolvedValue(buildContent()),
      findByClassIdsAndFormat: vi.fn().mockResolvedValue([]),
    };
    mockSessionRepo = {
      findById: vi.fn().mockResolvedValue(buildSession()),
      findByStudentAndExam: vi.fn().mockResolvedValue([buildSession()]),
      findAnswers: vi.fn().mockResolvedValue(new Map([['q-1', 'o-1a']])),
      findAnswersBySessions: vi
        .fn()
        .mockResolvedValue(new Map([['session-1', new Map([['q-1', 'o-1a']])]])),
      findFileIds: vi.fn().mockResolvedValue([]),
      findFileIdsBySessions: vi.fn().mockResolvedValue(new Map()),
      saveGrade: vi
        .fn()
        .mockImplementation(async (sessionId, input) =>
          buildSession({
            id: sessionId,
            status: ExamSessionStatus.COMPLETED,
            score: input.score,
            comment: input.comment,
            gradedAt: input.gradedAt,
            endedAt: input.endedAt,
          }),
        ),
    };
    mockStudentExamService = {
      finalizeExpiredSessionsForExam: vi
        .fn()
        .mockResolvedValue([buildSession({ id: 'session-1', studentId: 'stu-1', score: 5 })]),
    };
    mockAcademic = {
      assertCanManageClass: vi.fn().mockResolvedValue(undefined),
      getClassRoster: vi.fn().mockResolvedValue([
        {
          id: 'stu-1',
          classId: CLASS_ID,
          studentCode: '22110001',
          fullName: 'Nguyen Van A',
          email: 'a@student.edu.vn',
        },
        {
          id: 'stu-2',
          classId: CLASS_ID,
          studentCode: '22110002',
          fullName: 'Tran Thi B',
          email: 'b@student.edu.vn',
        },
      ]),
    };
    mockFileFacade = {
      getDownloadLink: vi.fn().mockResolvedValue(null),
      getDownloadLinks: vi.fn().mockResolvedValue([]),
      openReadStream: vi.fn(),
    };
    service = new ExamGradingService(
      mockExamRepo as unknown as ExamRepository,
      mockSessionRepo as unknown as ExamSessionRepository,
      mockStudentExamService as unknown as StudentExamService,
      mockAcademic as unknown as AcademicFacade,
      mockFileFacade as unknown as FileFacade,
    );
  });

  describe('getResults', () => {
    it('auto-finalizes expired sessions across the exam and builds roster results + summary stats', async () => {
      const results = await service.getResults(CLASS_ID, EXAM_ID, lecturer, NOW);

      expect(
        mockStudentExamService.finalizeExpiredSessionsForExam,
      ).toHaveBeenCalledWith(expect.objectContaining({ id: EXAM_ID }), NOW);
      expect(results.summary).toEqual({
        totalStudents: 2,
        startedCount: 1,
        submittedCount: 1,
        gradedCount: 1,
        averageScore: 5,
        maxScore: 5,
        minScore: 5,
      });
      expect(results.students[0]).toMatchObject({
        studentId: 'stu-1',
        studentCode: '22110001',
        status: 'GRADED',
        bestScore: 5,
        attemptsUsed: 1,
      });
      expect(results.students[1]).toMatchObject({
        studentId: 'stu-2',
        studentCode: '22110002',
        status: 'NOT_STARTED',
        bestScore: null,
        attemptsUsed: 0,
      });
    });

    it('marks FILE exam students with uploaded files but no score yet as SUBMITTED', async () => {
      mockExamRepo.findById.mockResolvedValue(
        buildExam({ format: ExamFormat.FILE }),
      );
      mockStudentExamService.finalizeExpiredSessionsForExam.mockResolvedValue([
        buildSession({
          id: 'session-file',
          studentId: 'stu-1',
          status: ExamSessionStatus.IN_PROGRESS,
          score: null,
          submittedAt: new Date('2026-11-12T08:20:00Z'),
        }),
      ]);
      mockSessionRepo.findFileIdsBySessions.mockResolvedValue(
        new Map([['session-file', ['file-1']]]),
      );
      mockFileFacade.getDownloadLinks.mockResolvedValue([
        {
          fileId: 'file-1',
          fileName: 'answer.pdf',
          contentType: 'application/pdf',
          size: 2048,
          downloadUrl: 'https://s3/answer.pdf',
        },
      ]);

      const results = await service.getResults(CLASS_ID, EXAM_ID, lecturer, NOW);

      expect(results.students[0].status).toBe('SUBMITTED');
      expect(results.students[0].attempts[0].submittedFiles).toHaveLength(1);
      expect(results.summary.submittedCount).toBe(1);
      expect(results.summary.gradedCount).toBe(0);
    });
  });

  describe('gradeSession', () => {
    it('saves the lecturer score and feedback comment and marks the session COMPLETED', async () => {
      mockExamRepo.findById.mockResolvedValue(
        buildExam({ format: ExamFormat.FILE }),
      );
      mockSessionRepo.findById.mockResolvedValue(
        buildSession({
          id: 'session-file',
          score: null,
          submittedAt: new Date('2026-11-12T08:20:00Z'),
        }),
      );

      const graded = await service.gradeSession(
        CLASS_ID,
        EXAM_ID,
        'session-file',
        { score: 9.25, comment: 'Great analysis!' },
        lecturer,
        NOW,
      );

      expect(mockSessionRepo.saveGrade).toHaveBeenCalledWith('session-file', {
        score: 9.25,
        comment: 'Great analysis!',
        gradedAt: NOW,
        approvedBy: LECTURER_ID,
        endedAt: expect.any(Date),
      });
      expect(graded).toMatchObject({
        sessionId: 'session-file',
        status: ExamSessionStatus.COMPLETED,
        score: 9.25,
        comment: 'Great analysis!',
      });
    });

    it('throws NotFoundException when the session does not belong to the exam', async () => {
      mockSessionRepo.findById.mockResolvedValue(
        buildSession({ examScheduleId: 'other-exam' }),
      );

      await expect(
        service.gradeSession(
          CLASS_ID,
          EXAM_ID,
          'session-1',
          { score: 8 },
          lecturer,
          NOW,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('reviewSession', () => {
    it('allows the lecturer to review a student attempt even when showResults is false', async () => {
      const review = await service.reviewSession(
        CLASS_ID,
        EXAM_ID,
        'session-1',
        lecturer,
        NOW,
      );

      expect(review.sessionId).toBe('session-1');
      expect(review.questions).toHaveLength(2);
      expect(review.questions[0].selectedOptionId).toBe('o-1a');
    });
  });

  describe('getLecturerQueue', () => {
    it('returns submitted or completed FILE exam attempts and skips unsubmitted IN_PROGRESS ones', async () => {
      const fileExam = buildExam({
        id: 'exam-file-1',
        examName: 'Exam 7 (Nop File)',
        format: ExamFormat.FILE,
        fileQuestionId: 'qfile-1',
      });
      mockExamRepo.findByClassIdsAndFormat.mockResolvedValue([fileExam]);
      mockAcademic.getClassRoster.mockResolvedValue([
        {
          id: 'stu-1',
          studentCode: 'SV26000001',
          fullName: 'Nguyen Van A',
          email: 'a@lms.edu.vn',
        },
        {
          id: 'stu-2',
          studentCode: 'SV26000002',
          fullName: 'Pham Quynh Anh',
          email: 'b@lms.edu.vn',
        },
      ]);
      const completedPending = buildSession({
        id: 'sess-completed',
        examScheduleId: 'exam-file-1',
        studentId: 'stu-2',
        status: ExamSessionStatus.COMPLETED,
        score: null,
        submittedAt: new Date('2026-11-12T09:30:00Z'),
      });
      const inProgressUnsubmitted = buildSession({
        id: 'sess-inprogress',
        examScheduleId: 'exam-file-1',
        studentId: 'stu-1',
        status: ExamSessionStatus.IN_PROGRESS,
        score: null,
        submittedAt: null,
        endedAt: null,
      });
      mockStudentExamService.finalizeExpiredSessionsForExam.mockResolvedValue([
        inProgressUnsubmitted,
        completedPending,
      ]);
      mockSessionRepo.findFileIdsBySessions.mockResolvedValue(
        new Map([['sess-completed', ['sfile-1']]]),
      );
      mockFileFacade.getDownloadLinks.mockResolvedValue([
        {
          fileId: 'qfile-1',
          fileName: 'prompt.pdf',
          contentType: 'application/pdf',
          size: 100,
          downloadUrl: '/files/qfile-1',
        },
        {
          fileId: 'sfile-1',
          fileName: 'answer.docx',
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 200,
          downloadUrl: '/files/sfile-1',
        },
      ]);

      const queue = await service.getLecturerQueue(
        [CLASS_ID, CLASS_ID],
        lecturer,
        NOW,
      );

      expect(mockAcademic.assertCanManageClass).toHaveBeenCalledTimes(1);
      expect(mockExamRepo.findByClassIdsAndFormat).toHaveBeenCalledWith(
        [CLASS_ID],
        ExamFormat.FILE,
      );
      expect(queue).toHaveLength(1);
      expect(queue[0]).toMatchObject({
        sessionId: 'sess-completed',
        examId: 'exam-file-1',
        classId: CLASS_ID,
        examName: 'Exam 7 (Nop File)',
        studentId: 'stu-2',
        studentCode: 'SV26000002',
        studentName: 'Pham Quynh Anh',
        score: null,
      });
      expect(queue[0].questionFile?.fileId).toBe('qfile-1');
      expect(queue[0].submittedFiles).toHaveLength(1);
      expect(queue[0].submittedFiles[0].fileId).toBe('sfile-1');
    });

    it('returns an empty array when no classIds are provided', async () => {
      const queue = await service.getLecturerQueue([], lecturer, NOW);
      expect(queue).toEqual([]);
      expect(mockExamRepo.findByClassIdsAndFormat).not.toHaveBeenCalled();
    });
  });

  describe('streamSubmissionsZip', () => {
    it('rejects non-FILE exams and empty submission sets', async () => {
      const response = { set: vi.fn() } as unknown as Response;

      mockExamRepo.findById.mockResolvedValue(
        buildExam({ format: ExamFormat.MULTIPLE_CHOICE }),
      );
      await expect(
        service.streamSubmissionsZip(
          CLASS_ID,
          EXAM_ID,
          undefined,
          lecturer,
          response,
          NOW,
        ),
      ).rejects.toThrow(BadRequestException);

      mockExamRepo.findById.mockResolvedValue(
        buildExam({ format: ExamFormat.FILE }),
      );
      mockStudentExamService.finalizeExpiredSessionsForExam.mockResolvedValue([
        buildSession({ id: 'sess-empty' }),
      ]);
      mockSessionRepo.findFileIdsBySessions.mockResolvedValue(new Map());

      await expect(
        service.streamSubmissionsZip(
          CLASS_ID,
          EXAM_ID,
          undefined,
          lecturer,
          response,
          NOW,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('streams a zip of submitted files for all sessions or a specific sessionId', async () => {
      const responseStream = new PassThrough();
      const setMock = vi.fn();
      const response = Object.assign(responseStream, {
        set: setMock,
      }) as unknown as Response;
      const chunks: Buffer[] = [];
      responseStream.on('data', (chunk: Buffer) => chunks.push(chunk));

      mockExamRepo.findById.mockResolvedValue(
        buildExam({ format: ExamFormat.FILE, examName: 'Midterm: File' }),
      );
      mockStudentExamService.finalizeExpiredSessionsForExam.mockResolvedValue([
        buildSession({ id: 'sess-1', studentId: 'stu-1' }),
        buildSession({ id: 'sess-2', studentId: 'stu-unknown' }),
      ]);
      mockSessionRepo.findFileIdsBySessions.mockResolvedValue(
        new Map([
          ['sess-1', ['f-1']],
          ['sess-2', ['f-2']],
        ]),
      );
      mockFileFacade.openReadStream.mockResolvedValue({
        fileName: 'submission.pdf',
        stream: Readable.from(['pdf-bytes']),
      });

      await service.streamSubmissionsZip(
        CLASS_ID,
        EXAM_ID,
        'sess-2',
        lecturer,
        response,
        NOW,
      );

      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/zip',
        }),
      );
      expect(mockFileFacade.openReadStream).toHaveBeenCalledTimes(1);
      expect(mockFileFacade.openReadStream).toHaveBeenCalledWith('f-2');
      expect(Buffer.concat(chunks).byteLength).toBeGreaterThan(0);
    });
  });
});

