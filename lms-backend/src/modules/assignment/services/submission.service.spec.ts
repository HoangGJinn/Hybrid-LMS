import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import type { FileFacade } from '../../../shared/file/facades/file.facade.js';
import type { AcademicFacade } from '../../academic/facades/academic.facade.js';
import type { ContentFacade } from '../../content/facades/content.facade.js';
import type { AssignmentSubmission } from '../entities/assignment-submission.entity.js';
import type { Assignment } from '../entities/assignment.entity.js';
import { SubmissionType } from '../enums/submission-type.enum.js';
import type { AssignmentRepository } from '../repositories/assignment.repository.js';
import type { SubmissionRepository } from '../repositories/submission.repository.js';
import { SubmissionService } from './submission.service.js';

type Mock = ReturnType<typeof vi.fn>;

const CLASS_ID = 'class-1';
const ASSIGNMENT_ID = 'assign-1';
const NOW = new Date('2026-11-10T10:00:00Z');

const student = {
  id: 'stu-1',
  role: Role.STUDENT,
} as unknown as AuthenticatedUser;

const buildAssignment = (overrides: Partial<Assignment> = {}): Assignment =>
  ({
    id: ASSIGNMENT_ID,
    title: 'Lab 1',
    instruction: 'Submit code',
    openAt: new Date('2026-11-01T00:00:00Z'),
    endAt: new Date('2026-11-20T00:00:00Z'),
    submissionType: SubmissionType.FILE,
    acceptedExtensions: ['pdf', 'zip'],
    submissionNote: null,
    ...overrides,
  }) as Assignment;

const buildSubmission = (
  overrides: Partial<AssignmentSubmission> = {},
): AssignmentSubmission =>
  ({
    id: 'sub-1',
    assignmentId: ASSIGNMENT_ID,
    submittedBy: student.id,
    submittedAt: NOW,
    gradedAt: null,
    score: null,
    comment: null,
    answerText: null,
    ...overrides,
  }) as AssignmentSubmission;

describe('SubmissionService', () => {
  let service: SubmissionService;
  let submissionRepo: Record<keyof SubmissionRepository, Mock>;
  let assignmentRepo: Record<keyof AssignmentRepository, Mock>;
  let academicFacade: { assertCanViewClass: Mock };
  let contentFacade: { isAssignmentInClass: Mock };
  let fileFacade: {
    assertOwnedReadyFiles: Mock;
    deleteFiles: Mock;
    getDownloadLinks: Mock;
  };

  beforeEach(() => {
    submissionRepo = {
      findByStudent: vi.fn().mockResolvedValue(null),
      findById: vi.fn(),
      findAllByAssignment: vi.fn(),
      findByAssignments: vi.fn(),
      findByStudentInAssignments: vi.fn(),
      count: vi.fn().mockResolvedValue(4),
      findFileIds: vi.fn().mockResolvedValue([]),
      findFileIdsBySubmissions: vi.fn(),
      save: vi.fn(),
      saveGrade: vi.fn(),
    };
    assignmentRepo = {
      create: vi.fn(),
      update: vi.fn(),
      findById: vi.fn().mockResolvedValue(buildAssignment()),
      findByIds: vi.fn(),
      findFileIds: vi.fn(),
      deleteById: vi.fn(),
    };
    academicFacade = {
      assertCanViewClass: vi.fn().mockResolvedValue(undefined),
    };
    contentFacade = {
      isAssignmentInClass: vi.fn().mockResolvedValue(true),
    };
    fileFacade = {
      assertOwnedReadyFiles: vi.fn().mockResolvedValue(undefined),
      deleteFiles: vi.fn().mockResolvedValue(undefined),
      getDownloadLinks: vi.fn().mockResolvedValue([]),
    };

    service = new SubmissionService(
      submissionRepo as unknown as SubmissionRepository,
      assignmentRepo as unknown as AssignmentRepository,
      academicFacade as unknown as AcademicFacade,
      contentFacade as unknown as ContentFacade,
      fileFacade as unknown as FileFacade,
    );
  });

  describe('submit', () => {
    it('submits a FILE assignment, cleans up dropped files, and returns SubmissionView', async () => {
      submissionRepo.findByStudent.mockResolvedValue(buildSubmission());
      submissionRepo.findFileIds.mockResolvedValue(['f-old', 'f-keep']);
      fileFacade.getDownloadLinks.mockResolvedValue([
        { fileId: 'f-keep', fileName: 'report.PDF', downloadUrl: 'https://s3/1' },
      ]);
      submissionRepo.save.mockResolvedValue(buildSubmission({ score: '9.00' as never }));

      const view = await service.submit(
        CLASS_ID,
        ASSIGNMENT_ID,
        { fileIds: ['f-keep'] },
        student,
        NOW,
      );

      expect(fileFacade.deleteFiles).toHaveBeenCalledWith(['f-old']);
      expect(submissionRepo.save).toHaveBeenCalledWith(
        ASSIGNMENT_ID,
        student.id,
        ['f-keep'],
        null,
        NOW,
      );
      expect(view.score).toBe(9);
      expect(view.files).toHaveLength(1);
    });

    it('submits a TEXT assignment and allows any extension when acceptedExtensions is empty', async () => {
      assignmentRepo.findById.mockResolvedValue(
        buildAssignment({ submissionType: SubmissionType.TEXT }),
      );
      submissionRepo.save.mockResolvedValue(
        buildSubmission({ answerText: 'My essay' }),
      );

      const textView = await service.submit(
        CLASS_ID,
        ASSIGNMENT_ID,
        { fileIds: [], answerText: '  My essay  ' },
        student,
        NOW,
      );

      expect(submissionRepo.save).toHaveBeenCalledWith(
        ASSIGNMENT_ID,
        student.id,
        [],
        'My essay',
        NOW,
      );
      expect(textView.answerText).toBe('My essay');

      assignmentRepo.findById.mockResolvedValue(
        buildAssignment({ acceptedExtensions: [] }),
      );
      fileFacade.getDownloadLinks.mockResolvedValue([
        { fileId: 'f-1', fileName: 'notes.txt', downloadUrl: 'https://s3/txt' },
      ]);
      submissionRepo.save.mockResolvedValue(buildSubmission());

      await service.submit(
        CLASS_ID,
        ASSIGNMENT_ID,
        { fileIds: ['f-1'] },
        student,
        NOW,
      );
      expect(fileFacade.getDownloadLinks).toHaveBeenCalledWith(['f-1']);
    });

    it('rejects missing assignments, before openAt, after endAt, and graded submissions', async () => {
      contentFacade.isAssignmentInClass.mockResolvedValue(false);
      await expect(
        service.submit(CLASS_ID, ASSIGNMENT_ID, { fileIds: ['f-1'] }, student, NOW),
      ).rejects.toThrow(NotFoundException);

      contentFacade.isAssignmentInClass.mockResolvedValue(true);
      await expect(
        service.submit(
          CLASS_ID,
          ASSIGNMENT_ID,
          { fileIds: ['f-1'] },
          student,
          new Date('2026-10-31T00:00:00Z'),
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.submit(
          CLASS_ID,
          ASSIGNMENT_ID,
          { fileIds: ['f-1'] },
          student,
          new Date('2026-11-21T00:00:00Z'),
        ),
      ).rejects.toThrow(BadRequestException);

      fileFacade.getDownloadLinks.mockResolvedValue([
        { fileId: 'f-1', fileName: 'lab.pdf', downloadUrl: 'https://s3/1' },
      ]);
      submissionRepo.findByStudent.mockResolvedValue(
        buildSubmission({ score: 8 }),
      );
      await expect(
        service.submit(CLASS_ID, ASSIGNMENT_ID, { fileIds: ['f-1'] }, student, NOW),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects rule mismatches for TEXT and FILE assignments', async () => {
      assignmentRepo.findById.mockResolvedValue(
        buildAssignment({ submissionType: SubmissionType.TEXT }),
      );

      await expect(
        service.submit(
          CLASS_ID,
          ASSIGNMENT_ID,
          { fileIds: [], answerText: '   ' },
          student,
          NOW,
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.submit(
          CLASS_ID,
          ASSIGNMENT_ID,
          { fileIds: ['f-1'], answerText: 'Answer' },
          student,
          NOW,
        ),
      ).rejects.toThrow(BadRequestException);

      assignmentRepo.findById.mockResolvedValue(buildAssignment());
      await expect(
        service.submit(CLASS_ID, ASSIGNMENT_ID, { fileIds: [] }, student, NOW),
      ).rejects.toThrow(BadRequestException);

      fileFacade.getDownloadLinks.mockResolvedValue([
        { fileId: 'f-1', fileName: 'malware.exe', downloadUrl: 'https://s3/1' },
      ]);
      await expect(
        service.submit(CLASS_ID, ASSIGNMENT_ID, { fileIds: ['f-1'] }, student, NOW),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findViewByStudent and count', () => {
    it('returns null when student has no submission and builds view when present', async () => {
      expect(
        await service.findViewByStudent(ASSIGNMENT_ID, student.id),
      ).toBeNull();

      submissionRepo.findByStudent.mockResolvedValue(buildSubmission());
      submissionRepo.findFileIds.mockResolvedValue(['f-1']);
      fileFacade.getDownloadLinks.mockResolvedValue([
        { fileId: 'f-1', fileName: 'work.pdf', downloadUrl: 'https://s3/1' },
      ]);

      const view = await service.findViewByStudent(ASSIGNMENT_ID, student.id);
      expect(view?.files).toHaveLength(1);
      expect(await service.count(ASSIGNMENT_ID)).toBe(4);
    });
  });
});

