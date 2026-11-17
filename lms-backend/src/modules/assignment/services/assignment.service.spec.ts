import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import type { FileFacade } from '../../../shared/file/facades/file.facade.js';
import type { AcademicFacade } from '../../academic/facades/academic.facade.js';
import type { ContentFacade } from '../../content/facades/content.facade.js';
import { MAX_ATTACHMENTS } from '../dto/create-assignment.dto.js';
import type { Assignment } from '../entities/assignment.entity.js';
import { AssignmentStatus } from '../enums/assignment-status.enum.js';
import { SubmissionType } from '../enums/submission-type.enum.js';
import type { AssignmentRepository } from '../repositories/assignment.repository.js';
import { AssignmentService } from './assignment.service.js';
import type { SubmissionService } from './submission.service.js';

type Mock = ReturnType<typeof vi.fn>;

const CLASS_ID = 'class-1';
const ASSIGNMENT_ID = 'assign-1';
const SECTION_ID = 'sec-1';

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
    title: 'Lab 1',
    instruction: 'Do the lab',
    openAt: new Date('2026-11-01T08:00:00Z'),
    endAt: new Date('2099-11-10T08:00:00Z'),
    submissionType: SubmissionType.FILE,
    acceptedExtensions: ['pdf', 'zip'],
    submissionNote: 'Upload zip',
    ...overrides,
  }) as Assignment;

describe('AssignmentService', () => {
  let service: AssignmentService;
  let assignmentRepo: {
    create: Mock;
    update: Mock;
    findById: Mock;
    findByIds: Mock;
    findFileIds: Mock;
    deleteById: Mock;
  };
  let submissionService: {
    submit: Mock;
    findViewByStudent: Mock;
    count: Mock;
  };
  let academicFacade: { assertCanManageClass: Mock; assertCanViewClass: Mock };
  let contentFacade: {
    isAssignmentInClass: Mock;
    addAssignmentToSection: Mock;
    removeAssignmentFromClass: Mock;
    isAssignmentReferenced: Mock;
  };
  let fileFacade: {
    assertOwnedReadyFiles: Mock;
    getDownloadLinks: Mock;
    deleteFiles: Mock;
  };

  beforeEach(() => {
    assignmentRepo = {
      create: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findByIds: vi.fn(),
      findFileIds: vi.fn().mockResolvedValue([]),
      deleteById: vi.fn(),
    };
    submissionService = {
      submit: vi.fn(),
      findViewByStudent: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
    };
    academicFacade = {
      assertCanManageClass: vi.fn().mockResolvedValue(undefined),
      assertCanViewClass: vi.fn().mockResolvedValue(undefined),
    };
    contentFacade = {
      isAssignmentInClass: vi.fn().mockResolvedValue(true),
      addAssignmentToSection: vi.fn().mockResolvedValue(true),
      removeAssignmentFromClass: vi.fn().mockResolvedValue(1),
      isAssignmentReferenced: vi.fn().mockResolvedValue(false),
    };
    fileFacade = {
      assertOwnedReadyFiles: vi.fn().mockResolvedValue(undefined),
      getDownloadLinks: vi.fn().mockResolvedValue([]),
      deleteFiles: vi.fn().mockResolvedValue(undefined),
    };

    service = new AssignmentService(
      assignmentRepo as unknown as AssignmentRepository,
      submissionService as unknown as SubmissionService,
      academicFacade as unknown as AcademicFacade,
      contentFacade as unknown as ContentFacade,
      fileFacade as unknown as FileFacade,
    );
  });

  describe('create', () => {
    const createDto = {
      title: 'Lab 1',
      instruction: 'Do the lab',
      openAt: '2026-11-01T08:00:00Z',
      endAt: '2099-11-10T08:00:00Z',
      submissionType: SubmissionType.FILE,
      acceptedExtensions: ['pdf', 'zip'],
      submissionNote: 'Upload zip',
      fileIds: ['f-1'],
    };

    it('creates a FILE assignment with extensions and builds view for lecturer', async () => {
      const entity = buildAssignment();
      assignmentRepo.create.mockResolvedValue(entity);
      assignmentRepo.findFileIds.mockResolvedValue(['f-1']);
      fileFacade.getDownloadLinks.mockResolvedValue([
        { fileId: 'f-1', fileName: 'brief.pdf', downloadUrl: 'https://s3/brief.pdf' },
      ]);
      submissionService.count.mockResolvedValue(3);

      const view = await service.create(
        CLASS_ID,
        { ...createDto, submissionNote: '  Upload zip  ' },
        lecturer,
      );

      expect(academicFacade.assertCanManageClass).toHaveBeenCalledWith(
        CLASS_ID,
        lecturer,
      );
      expect(fileFacade.assertOwnedReadyFiles).toHaveBeenCalledWith(
        ['f-1'],
        lecturer.id,
      );
      expect(assignmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          acceptedExtensions: ['pdf', 'zip'],
          submissionNote: 'Upload zip',
          createdBy: lecturer.id,
        }),
        ['f-1'],
      );
      expect(view.submissionCount).toBe(3);
      expect(view.mySubmission).toBeNull();
      expect(view.status).toBe(AssignmentStatus.OPEN);
    });

    it('clears acceptedExtensions and trims empty submissionNote for TEXT assignment', async () => {
      const entity = buildAssignment({
        submissionType: SubmissionType.TEXT,
        acceptedExtensions: [],
        submissionNote: null,
      });
      assignmentRepo.create.mockResolvedValue(entity);

      await service.create(
        CLASS_ID,
        {
          title: 'Essay',
          instruction: 'Write it',
          openAt: '2026-11-01T08:00:00Z',
          endAt: '2099-11-10T08:00:00Z',
          submissionType: SubmissionType.TEXT,
          acceptedExtensions: ['pdf'],
          submissionNote: '   ',
          fileIds: [],
        },
        lecturer,
      );

      expect(assignmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          acceptedExtensions: [],
          submissionNote: null,
        }),
        [],
      );
    });

    it('throws BadRequestException when due date is not after open date', async () => {
      await expect(
        service.create(
          CLASS_ID,
          {
            title: 'Invalid',
            instruction: 'Desc',
            openAt: '2026-11-10T08:00:00Z',
            endAt: '2026-11-10T08:00:00Z',
            submissionType: SubmissionType.FILE,
            acceptedExtensions: [],
            fileIds: [],
          },
          lecturer,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(assignmentRepo.create).not.toHaveBeenCalled();
    });

    it('propagates ForbiddenException when the user cannot manage the class', async () => {
      academicFacade.assertCanManageClass.mockRejectedValue(new ForbiddenException());

      await expect(service.create(CLASS_ID, createDto, student)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(assignmentRepo.create).not.toHaveBeenCalled();
    });

    describe('with a section', () => {
      const dtoWithSection = { ...createDto, sectionId: SECTION_ID };

      it('does not place the assignment when no section is given', async () => {
        assignmentRepo.create.mockResolvedValue(buildAssignment());

        await service.create(CLASS_ID, createDto, lecturer);

        expect(contentFacade.addAssignmentToSection).not.toHaveBeenCalled();
      });

      it('places the new assignment at the end of the section', async () => {
        assignmentRepo.create.mockResolvedValue(buildAssignment());

        await service.create(CLASS_ID, dtoWithSection, lecturer);

        expect(contentFacade.addAssignmentToSection).toHaveBeenCalledWith(
          CLASS_ID,
          SECTION_ID,
          ASSIGNMENT_ID,
          'Lab 1',
        );
        expect(assignmentRepo.deleteById).not.toHaveBeenCalled();
        expect(fileFacade.deleteFiles).not.toHaveBeenCalled();
      });

      it('discards the assignment and its files when the section is not of the class', async () => {
        assignmentRepo.create.mockResolvedValue(buildAssignment());
        contentFacade.addAssignmentToSection.mockResolvedValue(false);

        await expect(
          service.create(CLASS_ID, dtoWithSection, lecturer),
        ).rejects.toThrow(NotFoundException);

        expect(assignmentRepo.deleteById).toHaveBeenCalledWith(ASSIGNMENT_ID);
        expect(fileFacade.deleteFiles).toHaveBeenCalledWith(['f-1']);
      });

      it('discards the assignment and rethrows when placing fails unexpectedly', async () => {
        const error = new Error('db down');
        assignmentRepo.create.mockResolvedValue(buildAssignment());
        contentFacade.addAssignmentToSection.mockRejectedValue(error);

        await expect(service.create(CLASS_ID, dtoWithSection, lecturer)).rejects.toBe(error);

        expect(assignmentRepo.deleteById).toHaveBeenCalledWith(ASSIGNMENT_ID);
        expect(fileFacade.deleteFiles).toHaveBeenCalledWith(['f-1']);
      });
    });
  });

  describe('update', () => {
    const baseDto = {
      title: 'Updated',
      instruction: 'New',
      openAt: '2026-11-01T08:00:00Z',
      endAt: '2099-11-20T08:00:00Z',
      submissionType: SubmissionType.FILE,
      acceptedExtensions: ['pdf'],
      submissionNote: 'Note',
      keptFileIds: ['f-keep'],
      fileIds: ['f-new'],
    };

    it('throws NotFoundException when assignment is not in class or missing', async () => {
      contentFacade.isAssignmentInClass.mockResolvedValue(false);
      await expect(
        service.update(CLASS_ID, ASSIGNMENT_ID, baseDto, lecturer),
      ).rejects.toThrow(NotFoundException);

      contentFacade.isAssignmentInClass.mockResolvedValue(true);
      assignmentRepo.findById.mockResolvedValue(null);
      await expect(
        service.update(CLASS_ID, ASSIGNMENT_ID, baseDto, lecturer),
      ).rejects.toThrow(NotFoundException);
    });

    it('validates schedule, locked submissionType, kept/new files, and attachment cap', async () => {
      assignmentRepo.findById.mockResolvedValue(buildAssignment());
      assignmentRepo.findFileIds.mockResolvedValue(['f-keep', 'f-drop']);

      await expect(
        service.update(
          CLASS_ID,
          ASSIGNMENT_ID,
          { ...baseDto, endAt: baseDto.openAt },
          lecturer,
        ),
      ).rejects.toThrow(BadRequestException);

      submissionService.count.mockResolvedValue(2);
      await expect(
        service.update(
          CLASS_ID,
          ASSIGNMENT_ID,
          { ...baseDto, submissionType: SubmissionType.TEXT },
          lecturer,
        ),
      ).rejects.toThrow(BadRequestException);

      submissionService.count.mockResolvedValue(0);
      await expect(
        service.update(
          CLASS_ID,
          ASSIGNMENT_ID,
          { ...baseDto, keptFileIds: ['f-unknown'] },
          lecturer,
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.update(
          CLASS_ID,
          ASSIGNMENT_ID,
          { ...baseDto, fileIds: ['f-keep'] },
          lecturer,
        ),
      ).rejects.toThrow(BadRequestException);

      const extraIds = Array.from(
        { length: MAX_ATTACHMENTS },
        (_, i) => `f-${i}`,
      );
      await expect(
        service.update(
          CLASS_ID,
          ASSIGNMENT_ID,
          { ...baseDto, fileIds: extraIds },
          lecturer,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if repository update returns null', async () => {
      assignmentRepo.findById.mockResolvedValue(buildAssignment());
      assignmentRepo.findFileIds.mockResolvedValue(['f-keep']);
      assignmentRepo.update.mockResolvedValue(null);

      await expect(
        service.update(CLASS_ID, ASSIGNMENT_ID, baseDto, lecturer),
      ).rejects.toThrow(NotFoundException);
      expect(fileFacade.deleteFiles).not.toHaveBeenCalled();
    });

    it('updates assignment and deletes unkept files after unlinking', async () => {
      const updatedEntity = buildAssignment({ title: 'Updated' });
      assignmentRepo.findById.mockResolvedValue(buildAssignment());
      assignmentRepo.findFileIds
        .mockResolvedValueOnce(['f-keep', 'f-drop'])
        .mockResolvedValueOnce(['f-keep', 'f-new']);
      assignmentRepo.update.mockResolvedValue(updatedEntity);

      const result = await service.update(
        CLASS_ID,
        ASSIGNMENT_ID,
        baseDto,
        lecturer,
      );

      expect(assignmentRepo.update).toHaveBeenCalledWith(
        ASSIGNMENT_ID,
        expect.objectContaining({ title: 'Updated' }),
        ['f-drop'],
        ['f-new'],
      );
      expect(fileFacade.deleteFiles).toHaveBeenCalledWith(['f-drop']);
      expect(result.title).toBe('Updated');
    });

    it('skips deleteFiles when no files were removed', async () => {
      assignmentRepo.findById.mockResolvedValue(
        buildAssignment({ submissionType: SubmissionType.TEXT }),
      );
      assignmentRepo.findFileIds.mockResolvedValue(['f-keep']);
      assignmentRepo.update.mockResolvedValue(
        buildAssignment({ submissionType: SubmissionType.TEXT }),
      );

      await service.update(
        CLASS_ID,
        ASSIGNMENT_ID,
        {
          ...baseDto,
          submissionType: SubmissionType.TEXT,
          submissionNote: '  ',
        },
        lecturer,
      );

      expect(fileFacade.deleteFiles).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('loads student submission view for STUDENT role', async () => {
      assignmentRepo.findById.mockResolvedValue(buildAssignment());
      submissionService.findViewByStudent.mockResolvedValue({
        id: 'sub-1',
        submittedAt: new Date(),
        score: 9,
        comment: 'Nice',
        answerText: null,
        files: [],
      });

      const view = await service.findOne(CLASS_ID, ASSIGNMENT_ID, student);

      expect(academicFacade.assertCanViewClass).toHaveBeenCalledWith(
        CLASS_ID,
        student,
      );
      expect(submissionService.findViewByStudent).toHaveBeenCalledWith(
        ASSIGNMENT_ID,
        student.id,
      );
      expect(submissionService.count).not.toHaveBeenCalled();
      expect(view.status).toBe(AssignmentStatus.GRADED);
      expect(view.submissionCount).toBe(0);
    });

    it('hides hidden assignments from students only', async () => {
      assignmentRepo.findById.mockResolvedValue(buildAssignment());

      await service.findOne(CLASS_ID, ASSIGNMENT_ID, student);
      expect(contentFacade.isAssignmentInClass).toHaveBeenLastCalledWith(
        CLASS_ID,
        ASSIGNMENT_ID,
        { visibleOnly: true },
      );

      await service.findOne(CLASS_ID, ASSIGNMENT_ID, lecturer);
      expect(contentFacade.isAssignmentInClass).toHaveBeenLastCalledWith(
        CLASS_ID,
        ASSIGNMENT_ID,
        { visibleOnly: false },
      );
    });

    it('counts submissions for a lecturer instead of loading one submission', async () => {
      assignmentRepo.findById.mockResolvedValue(buildAssignment());
      submissionService.count.mockResolvedValue(5);

      const view = await service.findOne(CLASS_ID, ASSIGNMENT_ID, lecturer);

      expect(view.submissionCount).toBe(5);
      expect(submissionService.findViewByStudent).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when assignment does not belong to class', async () => {
      contentFacade.isAssignmentInClass.mockResolvedValue(false);
      await expect(
        service.findOne(CLASS_ID, ASSIGNMENT_ID, student),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the assignment row is missing', async () => {
      assignmentRepo.findById.mockResolvedValue(null);

      await expect(
        service.findOne(CLASS_ID, ASSIGNMENT_ID, student),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove (soft delete)', () => {
    it('soft-deletes the assignment from the class, recording who asked', async () => {
      await expect(
        service.remove(CLASS_ID, ASSIGNMENT_ID, lecturer),
      ).resolves.toBeUndefined();

      expect(academicFacade.assertCanManageClass).toHaveBeenCalledWith(
        CLASS_ID,
        lecturer,
      );
      expect(contentFacade.isAssignmentInClass).toHaveBeenCalledWith(
        CLASS_ID,
        ASSIGNMENT_ID,
      );
      expect(submissionService.count).toHaveBeenCalledWith(ASSIGNMENT_ID);
      expect(contentFacade.removeAssignmentFromClass).toHaveBeenCalledWith(
        CLASS_ID,
        ASSIGNMENT_ID,
        lecturer.id,
      );
    });

    it('keeps the assignment row and its files for the clean-up job', async () => {
      await service.remove(CLASS_ID, ASSIGNMENT_ID, lecturer);

      expect(assignmentRepo.deleteById).not.toHaveBeenCalled();
      expect(fileFacade.deleteFiles).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the assignment is not in the class', async () => {
      contentFacade.isAssignmentInClass.mockResolvedValue(false);

      await expect(
        service.remove(CLASS_ID, ASSIGNMENT_ID, lecturer),
      ).rejects.toThrow(NotFoundException);
      expect(submissionService.count).not.toHaveBeenCalled();
      expect(contentFacade.removeAssignmentFromClass).not.toHaveBeenCalled();
    });

    it('throws ConflictException when students have already submitted', async () => {
      submissionService.count.mockResolvedValue(1);

      await expect(
        service.remove(CLASS_ID, ASSIGNMENT_ID, lecturer),
      ).rejects.toThrow(ConflictException);
      expect(contentFacade.removeAssignmentFromClass).not.toHaveBeenCalled();
    });

    it('propagates ForbiddenException when the user cannot manage the class', async () => {
      academicFacade.assertCanManageClass.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(
        service.remove(CLASS_ID, ASSIGNMENT_ID, student),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(contentFacade.isAssignmentInClass).not.toHaveBeenCalled();
      expect(contentFacade.removeAssignmentFromClass).not.toHaveBeenCalled();
    });
  });
});