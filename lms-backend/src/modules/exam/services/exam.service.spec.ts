import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { FilePurpose } from '../../../shared/file/enums/file-purpose.enum.js';
import type { FileFacade } from '../../../shared/file/facades/file.facade.js';
import type { AcademicFacade } from '../../academic/facades/academic.facade.js';
import type { ContentFacade } from '../../content/facades/content.facade.js';
import type {
  CreateExamDto,
  UpdateExamScheduleDto,
} from '../dto/create-exam.dto.js';
import type { ExamSchedule } from '../entities/exam-schedule.entity.js';
import { ExamFormat } from '../enums/exam-format.enum.js';
import type {
  ExamRepository,
  ExamUpdate,
} from '../repositories/exam.repository.js';
import { ExamService } from './exam.service.js';

type Mock = ReturnType<typeof vi.fn>;

const CLASS_ID = 'class-1';
const EXAM_ID = 'exam-1';
const NOW = new Date('2026-11-10T08:00:00Z');
const lecturer = { id: 'lec-1', role: Role.LECTURER } as unknown as AuthenticatedUser;
const otherLecturer = { id: 'lec-2', role: Role.LECTURER } as unknown as AuthenticatedUser;

const buildQuestion = (
  content = 'What is 2 + 2?',
  correctIndex = 1,
  answers = ['3', '4', '5', '6'],
) => ({
  content,
  options: answers.map((answer, index) => ({
    content: answer,
    isCorrect: index === correctIndex,
  })),
});

const buildDto = (overrides: Partial<CreateExamDto> = {}): CreateExamDto =>
  ({
    examName: 'Midterm',
    startTime: '2026-11-12T08:00:00Z',
    endTime: '2026-11-12T10:00:00Z',
    durationMinutes: 60,
    format: ExamFormat.MULTIPLE_CHOICE,
    questions: [buildQuestion()],
    ...overrides,
  }) as CreateExamDto;

const buildFileDto = (overrides: Partial<CreateExamDto> = {}): CreateExamDto =>
  buildDto({
    format: ExamFormat.FILE,
    questions: undefined,
    fileId: 'file-1',
    ...overrides,
  });

const buildExam = (overrides: Partial<ExamSchedule> = {}): ExamSchedule =>
  ({
    id: EXAM_ID,
    classId: CLASS_ID,
    examName: 'Midterm',
    startTime: new Date('2026-11-12T08:00:00Z'),
    endTime: new Date('2026-11-12T10:00:00Z'),
    durationMinutes: 60,
    format: ExamFormat.MULTIPLE_CHOICE,
    fileQuestionId: null,
    maxAttempts: 1,
    showResults: true,
    shuffleQuestions: false,
    shuffleOptions: false,
    ...overrides,
  }) as ExamSchedule;

const buildQueryError = (code: string): QueryFailedError =>
  new QueryFailedError('query', [], Object.assign(new Error('db'), { code }));

/** NOW lies inside this window: the exam is open (a 3 hour window, 60 minutes per student). */
const OPEN_WINDOW = {
  startTime: new Date('2026-11-10T07:00:00Z'),
  endTime: new Date('2026-11-10T10:00:00Z'),
};

/** NOW lies after this window: the exam is closed. */
const CLOSED_WINDOW = {
  startTime: new Date('2026-11-10T04:00:00Z'),
  endTime: new Date('2026-11-10T06:00:00Z'),
};

describe('ExamService', () => {
  let mockRepository: {
    create: Mock;
    update: Mock;
    findById: Mock;
    findContent: Mock;
    hasSessions: Mock;
    countSessions: Mock;
    deleteById: Mock;
  };
  /** What the locked row of `update` holds, and how many sessions it counts. */
  let lockedExam: ExamSchedule;
  let sessionCount: number;
  let mockAcademic: { assertCanManageClass: Mock };
  let mockContent: { removeExamFromClass: Mock; isExamReferenced: Mock };
  let mockFile: {
    assertOwnedReadyFileOfPurpose: Mock;
    getDownloadLinks: Mock;
    deleteFile: Mock;
  };
  let service: ExamService;

  beforeEach(() => {
    lockedExam = buildExam();
    sessionCount = 0;
    mockRepository = {
      create: vi.fn().mockImplementation(async () => buildExam()),
      // Runs the service's decision against the locked row, like the real transaction does.
      update: vi
        .fn()
        .mockImplementation(
          async (
            _id: string,
            build: (current: ExamSchedule, count: number) => ExamUpdate,
          ) => {
            const change = build(lockedExam, sessionCount);
            return {
              exam: buildExam({
                ...lockedExam,
                examName: change.examName,
                startTime: change.startTime,
                endTime: change.endTime,
                durationMinutes: change.durationMinutes,
                maxAttempts: change.maxAttempts,
                showResults: change.showResults,
                ...(change.content && {
                  format: change.content.format,
                  fileQuestionId: change.content.fileQuestionId,
                  shuffleQuestions: change.content.shuffleQuestions,
                  shuffleOptions: change.content.shuffleOptions,
                }),
              }),
              previousFileId: lockedExam.fileQuestionId,
            };
          },
        ),
      findById: vi.fn().mockImplementation(async () => lockedExam),
      findContent: vi
        .fn()
        .mockResolvedValue({ questions: [], optionsByQuestionId: new Map() }),
      hasSessions: vi.fn().mockResolvedValue(false),
      countSessions: vi.fn().mockImplementation(async () => sessionCount),
      deleteById: vi.fn().mockResolvedValue(undefined),
    };
    mockAcademic = {
      assertCanManageClass: vi.fn().mockResolvedValue(undefined),
    };
    mockContent = {
      removeExamFromClass: vi.fn().mockResolvedValue(1),
      isExamReferenced: vi.fn().mockResolvedValue(false),
    };
    mockFile = {
      assertOwnedReadyFileOfPurpose: vi.fn().mockResolvedValue(undefined),
      getDownloadLinks: vi.fn().mockResolvedValue([]),
      deleteFile: vi.fn().mockResolvedValue(undefined),
    };
    service = new ExamService(
      mockRepository as unknown as ExamRepository,
      mockAcademic as unknown as AcademicFacade,
      mockContent as unknown as ContentFacade,
      mockFile as unknown as FileFacade,
    );
  });

  describe('create', () => {
    it('should save a multiple-choice exam with its questions and return the view', async () => {
      const actualView = await service.create(CLASS_ID, buildDto(), lecturer, NOW);

      expect(mockAcademic.assertCanManageClass).toHaveBeenCalledWith(CLASS_ID, lecturer);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          classId: CLASS_ID,
          examName: 'Midterm',
          durationMinutes: 60,
          format: ExamFormat.MULTIPLE_CHOICE,
          fileQuestionId: null,
          startTime: new Date('2026-11-12T08:00:00Z'),
          endTime: new Date('2026-11-12T10:00:00Z'),
          questions: [buildQuestion()],
        }),
      );
      expect(mockFile.assertOwnedReadyFileOfPurpose).not.toHaveBeenCalled();
      expect(actualView).toMatchObject({ id: EXAM_ID, questions: [], file: null });
    });

    it('should save a file exam after checking the file belongs to the lecturer and is an exam file', async () => {
      mockRepository.create.mockResolvedValue(buildExam({ format: ExamFormat.FILE, fileQuestionId: 'file-1' }));
      mockFile.getDownloadLinks.mockResolvedValue([{ fileId: 'file-1' }]);

      const actualView = await service.create(CLASS_ID, buildFileDto(), lecturer, NOW);

      expect(mockFile.assertOwnedReadyFileOfPurpose).toHaveBeenCalledWith(
        'file-1',
        'lec-1',
        FilePurpose.EXAM,
      );
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ fileQuestionId: 'file-1', questions: [] }),
      );
      expect(actualView.file).toEqual({ fileId: 'file-1' });
    });

    it('should reject lecturers who do not manage the class before doing anything else', async () => {
      mockAcademic.assertCanManageClass.mockRejectedValue(new ForbiddenException());

      await expect(
        service.create(CLASS_ID, buildDto(), otherLecturer, NOW),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockFile.assertOwnedReadyFileOfPurpose).not.toHaveBeenCalled();
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    describe('schedule', () => {
      it('should reject an end time that is not after the start time', async () => {
        await expect(
          service.create(
            CLASS_ID,
            buildDto({ endTime: '2026-11-12T08:00:00Z' }),
            lecturer,
            NOW,
          ),
        ).rejects.toThrow('The end time must be after the start time');
        expect(mockRepository.create).not.toHaveBeenCalled();
      });

      it('should reject an exam that has already ended', async () => {
        await expect(
          service.create(
            CLASS_ID,
            buildDto({
              startTime: '2026-11-01T08:00:00Z',
              endTime: '2026-11-01T10:00:00Z',
            }),
            lecturer,
            NOW,
          ),
        ).rejects.toThrow('The end time must be in the future');
      });

      it('should accept an exam that has already opened but not yet ended', async () => {
        await expect(
          service.create(
            CLASS_ID,
            buildDto({
              startTime: '2026-11-09T08:00:00Z',
              endTime: '2026-11-12T10:00:00Z',
            }),
            lecturer,
            NOW,
          ),
        ).resolves.toBeDefined();
      });

      it('should reject a duration longer than the time between start and end', async () => {
        await expect(
          service.create(CLASS_ID, buildDto({ durationMinutes: 121 }), lecturer, NOW),
        ).rejects.toThrow('The duration cannot be longer');
      });

      it('should accept a duration that fills the whole window', async () => {
        await expect(
          service.create(CLASS_ID, buildDto({ durationMinutes: 120 }), lecturer, NOW),
        ).resolves.toBeDefined();
      });
    });

    describe('multiple-choice content', () => {
      it('should reject an exam without questions', async () => {
        for (const questions of [undefined, []]) {
          await expect(
            service.create(CLASS_ID, buildDto({ questions }), lecturer, NOW),
          ).rejects.toThrow('Add at least one question');
        }
        expect(mockRepository.create).not.toHaveBeenCalled();
      });

      it('should reject a question file on a multiple-choice exam', async () => {
        await expect(
          service.create(CLASS_ID, buildDto({ fileId: 'file-1' }), lecturer, NOW),
        ).rejects.toThrow('cannot have a question file');
      });

      it('should reject a question that has no correct answer and name the question', async () => {
        const noCorrect = buildQuestion();
        noCorrect.options.forEach((option) => {
          option.isCorrect = false;
        });

        await expect(
          service.create(
            CLASS_ID,
            buildDto({ questions: [buildQuestion(), noCorrect] }),
            lecturer,
            NOW,
          ),
        ).rejects.toThrow('Question 2 needs exactly one correct answer');
      });

      it('should reject a question with more than one correct answer', async () => {
        const twoCorrect = buildQuestion();
        twoCorrect.options[0].isCorrect = true;

        await expect(
          service.create(CLASS_ID, buildDto({ questions: [twoCorrect] }), lecturer, NOW),
        ).rejects.toThrow('Question 1 needs exactly one correct answer');
      });

      it('should reject a question with fewer than two answers', async () => {
        const oneAnswer = buildQuestion('Q', 0, ['a']);

        await expect(
          service.create(CLASS_ID, buildDto({ questions: [oneAnswer] }), lecturer, NOW),
        ).rejects.toThrow('Question 1 needs 2 to 6 answers');
      });

      it('should reject a question with more than six answers', async () => {
        const sevenAnswers = buildQuestion('Q', 0, ['a', 'b', 'c', 'd', 'e', 'f', 'g']);

        await expect(
          service.create(CLASS_ID, buildDto({ questions: [sevenAnswers] }), lecturer, NOW),
        ).rejects.toThrow('Question 1 needs 2 to 6 answers');
      });

      it.each([2, 3, 5, 6])('should accept a question with %i answers', async (count) => {
        const answers = Array.from({ length: count }, (_, i) => `answer ${i}`);
        const question = buildQuestion('Q', 0, answers);

        await expect(
          service.create(CLASS_ID, buildDto({ questions: [question] }), lecturer, NOW),
        ).resolves.toBeDefined();
      });

      it('should reject duplicate answers, ignoring case and surrounding spaces', async () => {
        const duplicated = buildQuestion('Q', 0, ['Paris', ' paris ', 'Rome', 'Oslo']);

        await expect(
          service.create(CLASS_ID, buildDto({ questions: [duplicated] }), lecturer, NOW),
        ).rejects.toThrow('Question 1 has duplicate answers');
      });
    });

    describe('file content', () => {
      it('should reject a file exam without a file', async () => {
        await expect(
          service.create(CLASS_ID, buildFileDto({ fileId: undefined }), lecturer, NOW),
        ).rejects.toThrow('Upload the question file');
      });

      it('should reject typed questions on a file exam', async () => {
        await expect(
          service.create(
            CLASS_ID,
            buildFileDto({ questions: [buildQuestion()] }),
            lecturer,
            NOW,
          ),
        ).rejects.toThrow('cannot also have typed questions');
      });

      it('should pass on the file check failure and save nothing', async () => {
        mockFile.assertOwnedReadyFileOfPurpose.mockRejectedValue(
          new BadRequestException('This file cannot be used here'),
        );

        await expect(
          service.create(CLASS_ID, buildFileDto(), lecturer, NOW),
        ).rejects.toThrow('This file cannot be used here');
        expect(mockRepository.create).not.toHaveBeenCalled();
      });

      it('should say so when the file already belongs to another exam', async () => {
        mockRepository.create.mockRejectedValue(buildQueryError('23505'));

        await expect(
          service.create(CLASS_ID, buildFileDto(), lecturer, NOW),
        ).rejects.toThrow('already used by another exam');
      });

      it('should not hide other database errors', async () => {
        mockRepository.create.mockRejectedValue(buildQueryError('08006'));

        await expect(
          service.create(CLASS_ID, buildFileDto(), lecturer, NOW),
        ).rejects.toBeInstanceOf(QueryFailedError);
      });
    });
  });

  describe('findOne', () => {
    it('should return the exam with its correct answers for the class lecturer', async () => {
      mockRepository.findContent.mockResolvedValue({
        questions: [{ id: 'q-1', content: 'Q', orderIndex: 0 }],
        optionsByQuestionId: new Map([
          [
            'q-1',
            [
              { id: 'o-1', content: 'A', isCorrect: false },
              { id: 'o-2', content: 'B', isCorrect: true },
            ],
          ],
        ]),
      });

      const actualView = await service.findOne(CLASS_ID, EXAM_ID, lecturer);

      expect(actualView.questions).toHaveLength(1);
      expect(actualView.questions[0].options.map((option) => option.isCorrect)).toEqual([
        false,
        true,
      ]);
    });

    it('should treat an exam of another class as missing', async () => {
      mockRepository.findById.mockResolvedValue(buildExam({ classId: 'class-2' }));

      await expect(
        service.findOne(CLASS_ID, EXAM_ID, lecturer),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockRepository.findContent).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for an unknown exam', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.findOne(CLASS_ID, EXAM_ID, lecturer),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should not reveal the exam to a user who cannot manage the class', async () => {
      mockAcademic.assertCanManageClass.mockRejectedValue(new ForbiddenException());

      await expect(
        service.findOne(CLASS_ID, EXAM_ID, otherLecturer),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should unlink the exam and delete it when nothing else needs it', async () => {
      await service.remove(CLASS_ID, EXAM_ID, lecturer);

      expect(mockContent.removeExamFromClass).toHaveBeenCalledWith(CLASS_ID, EXAM_ID);
      expect(mockRepository.deleteById).toHaveBeenCalledWith(EXAM_ID);
      expect(mockFile.deleteFile).not.toHaveBeenCalled();
    });

    it('should delete the question file after the exam record', async () => {
      mockRepository.findById.mockResolvedValue(
        buildExam({ format: ExamFormat.FILE, fileQuestionId: 'file-1' }),
      );
      const order: string[] = [];
      mockRepository.deleteById.mockImplementation(async () => {
        order.push('exam');
      });
      mockFile.deleteFile.mockImplementation(async () => {
        order.push('file');
      });

      await service.remove(CLASS_ID, EXAM_ID, lecturer);

      expect(mockFile.deleteFile).toHaveBeenCalledWith('file-1');
      expect(order).toEqual(['exam', 'file']);
    });

    it('should clean up an exam that was never placed in a section', async () => {
      mockContent.removeExamFromClass.mockResolvedValue(0);

      await service.remove(CLASS_ID, EXAM_ID, lecturer);

      expect(mockRepository.deleteById).toHaveBeenCalledWith(EXAM_ID);
    });

    it('should keep the data when a student has already started the exam', async () => {
      mockRepository.hasSessions.mockResolvedValue(true);

      await service.remove(CLASS_ID, EXAM_ID, lecturer);

      expect(mockContent.removeExamFromClass).toHaveBeenCalled();
      expect(mockRepository.deleteById).not.toHaveBeenCalled();
      expect(mockFile.deleteFile).not.toHaveBeenCalled();
    });

    it('should keep the data while another section still shows the exam', async () => {
      mockContent.isExamReferenced.mockResolvedValue(true);

      await service.remove(CLASS_ID, EXAM_ID, lecturer);

      expect(mockRepository.deleteById).not.toHaveBeenCalled();
    });

    it('should keep the data, without failing, when a session appears during deletion', async () => {
      mockRepository.findById.mockResolvedValue(
        buildExam({ format: ExamFormat.FILE, fileQuestionId: 'file-1' }),
      );
      mockRepository.deleteById.mockRejectedValue(buildQueryError('23503'));

      await expect(service.remove(CLASS_ID, EXAM_ID, lecturer)).resolves.toBeUndefined();
      expect(mockFile.deleteFile).not.toHaveBeenCalled();
    });

    it('should not hide other database errors', async () => {
      mockRepository.deleteById.mockRejectedValue(buildQueryError('08006'));

      await expect(
        service.remove(CLASS_ID, EXAM_ID, lecturer),
      ).rejects.toBeInstanceOf(QueryFailedError);
    });

    it('should treat an exam of another class as missing and change nothing', async () => {
      mockRepository.findById.mockResolvedValue(buildExam({ classId: 'class-2' }));

      await expect(
        service.remove(CLASS_ID, EXAM_ID, lecturer),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockContent.removeExamFromClass).not.toHaveBeenCalled();
      expect(mockRepository.deleteById).not.toHaveBeenCalled();
    });

    it('should reject lecturers who do not manage the class', async () => {
      mockAcademic.assertCanManageClass.mockRejectedValue(new ForbiddenException());

      await expect(
        service.remove(CLASS_ID, EXAM_ID, otherLecturer),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockContent.removeExamFromClass).not.toHaveBeenCalled();
    });
  });

  describe('view status', () => {
    it('should report UPCOMING before the start, with nothing started', async () => {
      const actual = await service.findOne(CLASS_ID, EXAM_ID, lecturer, NOW);

      expect(actual).toMatchObject({
        status: 'UPCOMING',
        startedCount: 0,
        isContentLocked: false,
      });
    });

    it('should report OPEN and locked inside the window', async () => {
      lockedExam = buildExam(OPEN_WINDOW);

      const actual = await service.findOne(CLASS_ID, EXAM_ID, lecturer, NOW);

      expect(actual).toMatchObject({ status: 'OPEN', isContentLocked: true });
    });

    it('should report CLOSED after the end', async () => {
      lockedExam = buildExam(CLOSED_WINDOW);

      const actual = await service.findOne(CLASS_ID, EXAM_ID, lecturer, NOW);

      expect(actual).toMatchObject({ status: 'CLOSED', isContentLocked: true });
    });

    it('should lock the content as soon as a student has started', async () => {
      sessionCount = 3;

      const actual = await service.findOne(CLASS_ID, EXAM_ID, lecturer, NOW);

      expect(actual).toMatchObject({
        status: 'UPCOMING',
        startedCount: 3,
        isContentLocked: true,
      });
    });
  });

  describe('update', () => {
    const newQuestions = [buildQuestion('Capital of France?', 0, ['Paris', 'Rome'])];

    it('should replace everything of an exam nobody has seen', async () => {
      const dto = buildDto({
        examName: 'Final',
        startTime: '2026-11-13T08:00:00Z',
        endTime: '2026-11-13T11:00:00Z',
        durationMinutes: 90,
        questions: newQuestions,
      });

      const actual = await service.update(CLASS_ID, EXAM_ID, dto, lecturer, NOW);

      expect(mockRepository.update).toHaveBeenCalledWith(EXAM_ID, expect.any(Function));
      expect(actual).toMatchObject({
        examName: 'Final',
        durationMinutes: 90,
        startTime: new Date('2026-11-13T08:00:00Z'),
        endTime: new Date('2026-11-13T11:00:00Z'),
      });
    });

    it('should apply the same validation as creating and change nothing when it fails', async () => {
      const dto = buildDto({ endTime: '2026-11-12T07:00:00Z' });

      await expect(
        service.update(CLASS_ID, EXAM_ID, dto, lecturer, NOW),
      ).rejects.toThrow('The end time must be after the start time');
      await expect(
        service.update(CLASS_ID, EXAM_ID, buildDto({ questions: [] }), lecturer, NOW),
      ).rejects.toThrow('Add at least one question');
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should refuse once the exam has opened', async () => {
      lockedExam = buildExam(OPEN_WINDOW);
      const dto = buildDto({
        startTime: '2026-11-10T07:00:00Z',
        endTime: '2026-11-10T12:00:00Z',
      });

      await expect(
        service.update(CLASS_ID, EXAM_ID, dto, lecturer, NOW),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should refuse when a session exists even though the exam has not opened', async () => {
      sessionCount = 1;

      await expect(
        service.update(CLASS_ID, EXAM_ID, buildDto(), lecturer, NOW),
      ).rejects.toThrow('can no longer be changed');
      expect(mockFile.deleteFile).not.toHaveBeenCalled();
    });

    it('should keep the question file without checking or deleting it', async () => {
      lockedExam = buildExam({ format: ExamFormat.FILE, fileQuestionId: 'file-1' });

      await service.update(CLASS_ID, EXAM_ID, buildFileDto({ examName: 'Renamed' }), lecturer, NOW);

      expect(mockFile.assertOwnedReadyFileOfPurpose).not.toHaveBeenCalled();
      expect(mockFile.deleteFile).not.toHaveBeenCalled();
    });

    it('should check a new question file and delete the old one afterwards', async () => {
      lockedExam = buildExam({ format: ExamFormat.FILE, fileQuestionId: 'file-1' });
      const order: string[] = [];
      mockRepository.update.mockImplementationOnce(async () => {
        order.push('saved');
        return { exam: buildExam({ format: ExamFormat.FILE, fileQuestionId: 'file-2' }), previousFileId: 'file-1' };
      });
      mockFile.deleteFile.mockImplementation(async () => {
        order.push('deleted');
      });

      await service.update(CLASS_ID, EXAM_ID, buildFileDto({ fileId: 'file-2' }), lecturer, NOW);

      expect(mockFile.assertOwnedReadyFileOfPurpose).toHaveBeenCalledWith(
        'file-2',
        'lec-1',
        FilePurpose.EXAM,
      );
      expect(mockFile.deleteFile).toHaveBeenCalledWith('file-1');
      expect(order).toEqual(['saved', 'deleted']);
    });

    it('should delete the old file when a file exam becomes multiple choice', async () => {
      lockedExam = buildExam({ format: ExamFormat.FILE, fileQuestionId: 'file-1' });

      await service.update(CLASS_ID, EXAM_ID, buildDto(), lecturer, NOW);

      expect(mockFile.deleteFile).toHaveBeenCalledWith('file-1');
    });

    it('should not fail the update when the old file cannot be deleted', async () => {
      lockedExam = buildExam({ format: ExamFormat.FILE, fileQuestionId: 'file-1' });
      mockFile.deleteFile.mockRejectedValue(new Error('S3 down'));

      await expect(
        service.update(CLASS_ID, EXAM_ID, buildDto(), lecturer, NOW),
      ).resolves.toMatchObject({ id: EXAM_ID });
    });

    it('should not touch the old file when the new file check fails', async () => {
      lockedExam = buildExam({ format: ExamFormat.FILE, fileQuestionId: 'file-1' });
      mockFile.assertOwnedReadyFileOfPurpose.mockRejectedValue(
        new BadRequestException('This file cannot be used here'),
      );

      await expect(
        service.update(CLASS_ID, EXAM_ID, buildFileDto({ fileId: 'file-2' }), lecturer, NOW),
      ).rejects.toThrow('This file cannot be used here');
      expect(mockRepository.update).not.toHaveBeenCalled();
      expect(mockFile.deleteFile).not.toHaveBeenCalled();
    });

    it('should answer 400 when the new file already belongs to another exam', async () => {
      mockRepository.update.mockRejectedValue(buildQueryError('23505'));

      await expect(
        service.update(CLASS_ID, EXAM_ID, buildFileDto({ fileId: 'file-2' }), lecturer, NOW),
      ).rejects.toThrow('already used by another exam');
    });

    it('should answer 404 when the exam is gone by the time it is locked', async () => {
      mockRepository.update.mockResolvedValue(null);

      await expect(
        service.update(CLASS_ID, EXAM_ID, buildDto(), lecturer, NOW),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should treat an exam of another class as missing', async () => {
      lockedExam = buildExam({ classId: 'class-2' });

      await expect(
        service.update(CLASS_ID, EXAM_ID, buildDto(), lecturer, NOW),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should reject lecturers who do not manage the class', async () => {
      mockAcademic.assertCanManageClass.mockRejectedValue(new ForbiddenException());

      await expect(
        service.update(CLASS_ID, EXAM_ID, buildDto(), otherLecturer, NOW),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('updateSchedule', () => {
    const run = (dto: UpdateExamScheduleDto) =>
      service.updateSchedule(CLASS_ID, EXAM_ID, dto, lecturer, NOW);

    it('should keep the fields that are left out', async () => {
      const actual = await run({ examName: 'Renamed' });

      expect(actual).toMatchObject({
        examName: 'Renamed',
        durationMinutes: 60,
        endTime: new Date('2026-11-12T10:00:00Z'),
        startTime: new Date('2026-11-12T08:00:00Z'),
      });
    });

    describe('before the exam opens and with nobody started', () => {
      it('should accept a shorter schedule', async () => {
        const actual = await run({ endTime: '2026-11-12T09:00:00Z', durationMinutes: 30 });

        expect(actual).toMatchObject({ durationMinutes: 30 });
      });

      it('should still reject an end before the start', async () => {
        await expect(run({ endTime: '2026-11-12T07:00:00Z' })).rejects.toThrow(
          'The end time must be after the start time',
        );
      });

      it('should still reject a duration longer than the window', async () => {
        await expect(run({ durationMinutes: 121 })).rejects.toThrow(
          'The duration cannot be longer',
        );
      });
    });

    describe.each([
      ['open', () => buildExam(OPEN_WINDOW), 0],
      ['not open yet but started', () => buildExam(), 2],
    ])('when the exam is %s', (_label, build, sessions) => {
      beforeEach(() => {
        lockedExam = build();
        sessionCount = sessions;
      });

      it('should accept a later closing time and a longer duration', async () => {
        const end = new Date(lockedExam.endTime.getTime() + 3_600_000).toISOString();

        const actual = await run({ endTime: end, durationMinutes: 90 });

        expect(actual.endTime).toEqual(new Date(end));
        expect(actual.durationMinutes).toBe(90);
      });

      it('should accept the same schedule with a new name', async () => {
        await expect(run({ examName: 'Renamed' })).resolves.toMatchObject({
          examName: 'Renamed',
        });
      });

      it('should refuse an earlier closing time', async () => {
        const end = new Date(lockedExam.endTime.getTime() - 60_000).toISOString();

        await expect(run({ endTime: end })).rejects.toThrow('can only be moved later');
      });

      it('should refuse a shorter duration', async () => {
        await expect(run({ durationMinutes: 59 })).rejects.toThrow(
          'can only be made longer',
        );
      });

      it('should still refuse a duration longer than the window', async () => {
        await expect(run({ durationMinutes: 400 })).rejects.toThrow(
          'The duration cannot be longer',
        );
      });

      it('should allow increasing maxAttempts or setting it to unlimited (null), and toggling showResults', async () => {
        lockedExam = buildExam({ ...build(), maxAttempts: 2, showResults: true });

        const more = await run({ maxAttempts: 5, showResults: false });
        expect(more).toMatchObject({ maxAttempts: 5, showResults: false });

        const unlimited = await run({ maxAttempts: null });
        expect(unlimited).toMatchObject({ maxAttempts: null });
      });

      it('should refuse reducing maxAttempts once locked', async () => {
        lockedExam = buildExam({ ...build(), maxAttempts: 3 });

        await expect(run({ maxAttempts: 2 })).rejects.toThrow(
          'Allowed attempts can only be increased',
        );
      });

      it('should refuse changing unlimited attempts to a finite limit once locked', async () => {
        lockedExam = buildExam({ ...build(), maxAttempts: null });

        await expect(run({ maxAttempts: 5 })).rejects.toThrow(
          'Allowed attempts can only be increased',
        );
      });
    });

    describe('when the exam is closed', () => {
      beforeEach(() => {
        lockedExam = buildExam(CLOSED_WINDOW);
      });

      it('should still allow a new name and toggling showResults', async () => {
        await expect(
          run({ examName: 'Renamed', showResults: false }),
        ).resolves.toMatchObject({
          examName: 'Renamed',
          showResults: false,
        });
      });

      it('should accept the unchanged schedule sent along with the name', async () => {
        await expect(
          run({
            examName: 'Renamed',
            endTime: CLOSED_WINDOW.endTime.toISOString(),
            durationMinutes: 60,
          }),
        ).resolves.toMatchObject({ examName: 'Renamed' });
      });

      it.each([
        { endTime: '2026-11-10T12:00:00Z' },
        { durationMinutes: 90 },
      ])('should refuse to change the schedule: %o', async (dto) => {
        await expect(run(dto)).rejects.toBeInstanceOf(ConflictException);
      });
    });

    it('should treat an exam of another class as missing', async () => {
      lockedExam = buildExam({ classId: 'class-2' });

      await expect(run({ examName: 'x' })).rejects.toBeInstanceOf(NotFoundException);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should reject lecturers who do not manage the class', async () => {
      mockAcademic.assertCanManageClass.mockRejectedValue(new ForbiddenException());

      await expect(run({ examName: 'x' })).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
