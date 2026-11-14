import { NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { PassThrough, Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import type { FileFacade } from '../../../shared/file/facades/file.facade.js';
import type { AcademicFacade } from '../../academic/facades/academic.facade.js';
import type { ContentFacade } from '../../content/facades/content.facade.js';
import type { AssignmentSubmission } from '../entities/assignment-submission.entity.js';
import type { Assignment } from '../entities/assignment.entity.js';
import { AssignmentStatus } from '../enums/assignment-status.enum.js';
import { SubmissionType } from '../enums/submission-type.enum.js';
import type { AssignmentRepository } from '../repositories/assignment.repository.js';
import type { SubmissionRepository } from '../repositories/submission.repository.js';
import { SubmissionReviewService } from './submission-review.service.js';

type Mock = ReturnType<typeof vi.fn>;

const CLASS_ID = 'class-1';
const ASSIGNMENT_ID = 'assign-1';
const SUBMISSION_ID = 'sub-1';

const lecturer = {
  id: 'lec-1',
  role: Role.LECTURER,
} as unknown as AuthenticatedUser;

const student = {
  id: 'stu-1',
  role: Role.STUDENT,
} as unknown as AuthenticatedUser;

const buildAssignment = (overrides: Partial<Assignment> = {}): Assignment =>
  ({
    id: ASSIGNMENT_ID,
    title: 'Lab 1: Intro/Setup',
    instruction: 'Do the work',
    openAt: new Date('2026-11-01T08:00:00Z'),
    endAt: new Date('2099-11-20T08:00:00Z'),
    submissionType: SubmissionType.FILE,
    acceptedExtensions: ['pdf'],
    submissionNote: null,
    ...overrides,
  }) as Assignment;

const buildSubmission = (
  overrides: Partial<AssignmentSubmission> = {},
): AssignmentSubmission =>
  ({
    id: SUBMISSION_ID,
    assignmentId: ASSIGNMENT_ID,
    submittedBy: student.id,
    submittedAt: new Date('2026-11-10T08:00:00Z'),
    gradedAt: null,
    score: null,
    comment: null,
    answerText: null,
    student: {
      studentCode: 'SV001',
      user: { fullName: 'Nguyen Van A' },
    },
    ...overrides,
  }) as unknown as AssignmentSubmission;

describe('SubmissionReviewService', () => {
  let service: SubmissionReviewService;
  let submissionRepo: Record<keyof SubmissionRepository, Mock>;
  let assignmentRepo: Record<keyof AssignmentRepository, Mock>;
  let academicFacade: {
    getClassesByStudent: Mock;
    assertCanManageClass: Mock;
  };
  let contentFacade: {
    findAssignmentsByClasses: Mock;
    isAssignmentInClass: Mock;
  };
  let fileFacade: {
    getDownloadLinks: Mock;
    openReadStream: Mock;
  };

  beforeEach(() => {
    submissionRepo = {
      findByStudent: vi.fn(),
      findById: vi.fn(),
      findAllByAssignment: vi.fn().mockResolvedValue([]),
      findByAssignments: vi.fn().mockResolvedValue([]),
      findByStudentInAssignments: vi.fn().mockResolvedValue([]),
      count: vi.fn(),
      findFileIds: vi.fn(),
      findFileIdsBySubmissions: vi.fn().mockResolvedValue(new Map()),
      save: vi.fn(),
      saveGrade: vi.fn().mockResolvedValue(undefined),
    };
    assignmentRepo = {
      create: vi.fn(),
      update: vi.fn(),
      findById: vi.fn().mockResolvedValue(buildAssignment()),
      findByIds: vi.fn().mockResolvedValue([]),
      findFileIds: vi.fn(),
      deleteById: vi.fn(),
    };
    academicFacade = {
      getClassesByStudent: vi.fn().mockResolvedValue([{ id: CLASS_ID }]),
      assertCanManageClass: vi.fn().mockResolvedValue(undefined),
    };
    contentFacade = {
      findAssignmentsByClasses: vi
        .fn()
        .mockResolvedValue([{ classId: CLASS_ID, assignmentId: ASSIGNMENT_ID }]),
      isAssignmentInClass: vi.fn().mockResolvedValue(true),
    };
    fileFacade = {
      getDownloadLinks: vi.fn().mockResolvedValue([]),
      openReadStream: vi.fn(),
    };

    service = new SubmissionReviewService(
      submissionRepo as unknown as SubmissionRepository,
      assignmentRepo as unknown as AssignmentRepository,
      academicFacade as unknown as AcademicFacade,
      contentFacade as unknown as ContentFacade,
      fileFacade as unknown as FileFacade,
    );
  });

  it('returns student assignments with computed statuses and student submissions', async () => {
    assignmentRepo.findByIds.mockResolvedValue([buildAssignment()]);
    submissionRepo.findByStudentInAssignments.mockResolvedValue([
      buildSubmission({ score: 8.5 }),
    ]);
    submissionRepo.findFileIdsBySubmissions.mockResolvedValue(
      new Map([[SUBMISSION_ID, ['f-1']]]),
    );
    fileFacade.getDownloadLinks.mockResolvedValue([
      { fileId: 'f-1', fileName: 'lab.pdf', downloadUrl: 'https://s3/lab.pdf' },
    ]);

    const assignments = await service.myAssignments(student);
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({
      classId: CLASS_ID,
      status: AssignmentStatus.GRADED,
    });

    const submissions = await service.mySubmissions(student);
    expect(submissions).toHaveLength(1);
    expect(submissions[0].fileNames).toEqual(['lab.pdf']);
    expect(submissions[0].score).toBe(8.5);
  });

  it('lists submissions for an assignment and rejects when assignment is not in class', async () => {
    submissionRepo.findAllByAssignment.mockResolvedValue([buildSubmission()]);

    const rows = await service.list(CLASS_ID, ASSIGNMENT_ID, lecturer);
    expect(rows).toHaveLength(1);
    expect(rows[0].studentCode).toBe('SV001');

    contentFacade.isAssignmentInClass.mockResolvedValue(false);
    await expect(
      service.list(CLASS_ID, ASSIGNMENT_ID, lecturer),
    ).rejects.toThrow(NotFoundException);
  });

  it('builds lecturerQueue across managed classes and skips orphaned assignments', async () => {
    assignmentRepo.findByIds.mockResolvedValue([buildAssignment()]);
    submissionRepo.findByAssignments.mockResolvedValue([
      buildSubmission(),
      buildSubmission({ id: 'orphan', assignmentId: 'missing-assign' }),
    ]);

    const queue = await service.lecturerQueue([CLASS_ID], lecturer);
    expect(academicFacade.assertCanManageClass).toHaveBeenCalledWith(
      CLASS_ID,
      lecturer,
    );
    expect(queue).toHaveLength(1);
    expect(queue[0].assignment.status).toBe(AssignmentStatus.SUBMITTED);
  });

  it('grades a submission and throws when submission is missing or belongs to another assignment', async () => {
    submissionRepo.findById.mockResolvedValue(null);
    await expect(
      service.grade(
        CLASS_ID,
        ASSIGNMENT_ID,
        SUBMISSION_ID,
        { score: 9, comment: 'Great' },
        lecturer,
      ),
    ).rejects.toThrow(NotFoundException);

    submissionRepo.findById.mockResolvedValue(
      buildSubmission({ assignmentId: 'other-assign' }),
    );
    await expect(
      service.grade(
        CLASS_ID,
        ASSIGNMENT_ID,
        SUBMISSION_ID,
        { score: 9 },
        lecturer,
      ),
    ).rejects.toThrow(NotFoundException);

    submissionRepo.findById
      .mockResolvedValueOnce(buildSubmission())
      .mockResolvedValueOnce(buildSubmission({ score: 9, comment: null }));

    const graded = await service.grade(
      CLASS_ID,
      ASSIGNMENT_ID,
      SUBMISSION_ID,
      { score: 9, comment: '   ' },
      lecturer,
    );
    expect(submissionRepo.saveGrade).toHaveBeenCalledWith(
      SUBMISSION_ID,
      9,
      null,
      expect.any(Date),
    );
    expect(graded.score).toBe(9);
  });

  describe('streamZip', () => {
    it('throws NotFoundException when assignment or matching submissions are missing', async () => {
      const response = new PassThrough() as unknown as Response;
      (response as unknown as { set: Mock }).set = vi.fn();

      assignmentRepo.findById.mockResolvedValue(null);
      await expect(
        service.streamZip(CLASS_ID, ASSIGNMENT_ID, undefined, lecturer, response),
      ).rejects.toThrow(NotFoundException);

      assignmentRepo.findById.mockResolvedValue(buildAssignment());
      submissionRepo.findAllByAssignment.mockResolvedValue([]);
      await expect(
        service.streamZip(CLASS_ID, ASSIGNMENT_ID, undefined, lecturer, response),
      ).rejects.toThrow(NotFoundException);

      submissionRepo.findAllByAssignment.mockResolvedValue([buildSubmission()]);
      await expect(
        service.streamZip(
          CLASS_ID,
          ASSIGNMENT_ID,
          'wrong-sub',
          lecturer,
          response,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('streams a zip containing text answers and attached submission files', async () => {
      const responseStream = new PassThrough();
      const setMock = vi.fn();
      const response = Object.assign(responseStream, {
        set: setMock,
      }) as unknown as Response;

      const chunks: Buffer[] = [];
      responseStream.on('data', (chunk: Buffer) => chunks.push(chunk));

      submissionRepo.findAllByAssignment.mockResolvedValue([
        buildSubmission({ answerText: 'Hello world answer' }),
      ]);
      submissionRepo.findFileIdsBySubmissions.mockResolvedValue(
        new Map([[SUBMISSION_ID, ['f-1']]]),
      );
      fileFacade.openReadStream.mockResolvedValue({
        fileName: 'report.txt',
        stream: Readable.from(['file-content']),
      });

      await service.streamZip(
        CLASS_ID,
        ASSIGNMENT_ID,
        SUBMISSION_ID,
        lecturer,
        response,
      );

      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/zip',
        }),
      );
      expect(Buffer.concat(chunks).byteLength).toBeGreaterThan(0);
    });
  });
});

