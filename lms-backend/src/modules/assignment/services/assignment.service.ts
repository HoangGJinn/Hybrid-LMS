import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { FileFacade } from '../../../shared/file/facades/file.facade.js';
import { AcademicFacade } from '../../academic/facades/academic.facade.js';
import { ContentFacade } from '../../content/facades/content.facade.js';
import {
  MAX_ATTACHMENTS,
  type CreateAssignmentDto,
} from '../dto/create-assignment.dto.js';
import type { UpdateAssignmentDto } from '../dto/update-assignment.dto.js';
import type { Assignment } from '../entities/assignment.entity.js';
import { SubmissionType } from '../enums/submission-type.enum.js';
import { AssignmentRepository } from '../repositories/assignment.repository.js';
import { AssignmentView } from '../types/assignment-view.type.js';
import { computeAssignmentStatus } from '../utils/assignment-status.util.js';
import { SubmissionService } from './submission.service.js';

/** Business rules for creating, viewing, editing and removing assignments of a class. */
@Injectable()
export class AssignmentService {
  constructor(
    private readonly assignmentRepository: AssignmentRepository,
    private readonly submissionService: SubmissionService,
    private readonly academicFacade: AcademicFacade,
    private readonly contentFacade: ContentFacade,
    private readonly fileFacade: FileFacade,
  ) {}

  /**
   * UC-33: creates an assignment from the brief, the schedule, the submission rules and the confirmed attachments.
   * The lecturer then places it in a section and saves the editor, which is what shows it to students.
   */
  async create(
    classId: string,
    dto: CreateAssignmentDto,
    user: AuthenticatedUser,
  ): Promise<AssignmentView> {
    await this.academicFacade.assertCanManageClass(classId, user);
    const openAt = new Date(dto.openAt);
    const endAt = new Date(dto.endAt);
    if (endAt <= openAt) {
      throw new BadRequestException(
        'The due date must be after the opening date',
      );
    }
    await this.fileFacade.assertOwnedReadyFiles(dto.fileIds, user.id);
    const isFileSubmission = dto.submissionType === SubmissionType.FILE;
    const assignment = await this.assignmentRepository.create(
      {
        title: dto.title,
        instruction: dto.instruction,
        openAt,
        endAt,
        submissionType: dto.submissionType,
        // Online answers take no files, so the accepted formats only matter for file submissions.
        acceptedExtensions: isFileSubmission ? dto.acceptedExtensions : [],
        submissionNote: dto.submissionNote?.trim() || null,
      },
      dto.fileIds,
    );
    return this.buildView(classId, assignment, user);
  }

  /**
   * Edits an assignment of the class: brief, schedule, submission rules and attachments.
   * The submission type is locked once somebody has submitted, because existing submissions
   * (files vs. typed answers) would no longer match it. Attachments left out of `keptFileIds`
   * are unlinked and deleted; `fileIds` are new uploads.
   */
  async update(
    classId: string,
    assignmentId: string,
    dto: UpdateAssignmentDto,
    user: AuthenticatedUser,
  ): Promise<AssignmentView> {
    await this.academicFacade.assertCanManageClass(classId, user);
    const isInClass = await this.contentFacade.isAssignmentInClass(
      classId,
      assignmentId,
    );
    const current = isInClass
      ? await this.assignmentRepository.findById(assignmentId)
      : null;
    if (!current) {
      throw new NotFoundException('Assignment not found');
    }
    const openAt = new Date(dto.openAt);
    const endAt = new Date(dto.endAt);
    if (endAt <= openAt) {
      throw new BadRequestException(
        'The due date must be after the opening date',
      );
    }
    const hasSubmissions =
      (await this.submissionService.count(assignmentId)) > 0;
    if (hasSubmissions && dto.submissionType !== current.submissionType) {
      throw new BadRequestException(
        'The submission type cannot be changed once students have submitted',
      );
    }
    const currentFileIds =
      await this.assignmentRepository.findFileIds(assignmentId);
    if (dto.keptFileIds.some((id) => !currentFileIds.includes(id))) {
      throw new BadRequestException(
        'Kept files must be attached to this assignment',
      );
    }
    if (dto.fileIds.some((id) => currentFileIds.includes(id))) {
      throw new BadRequestException('Those files are already attached');
    }
    if (dto.keptFileIds.length + dto.fileIds.length > MAX_ATTACHMENTS) {
      throw new BadRequestException(
        `At most ${MAX_ATTACHMENTS} files can be attached`,
      );
    }
    await this.fileFacade.assertOwnedReadyFiles(dto.fileIds, user.id);
    const removedFileIds = currentFileIds.filter(
      (id) => !dto.keptFileIds.includes(id),
    );
    const isFileSubmission = dto.submissionType === SubmissionType.FILE;
    const updated = await this.assignmentRepository.update(
      assignmentId,
      {
        title: dto.title,
        instruction: dto.instruction,
        openAt,
        endAt,
        submissionType: dto.submissionType,
        acceptedExtensions: isFileSubmission ? dto.acceptedExtensions : [],
        submissionNote: dto.submissionNote?.trim() || null,
      },
      removedFileIds,
      dto.fileIds,
    );
    if (!updated) {
      throw new NotFoundException('Assignment not found');
    }
    // Only after the links are gone, so a failed update never leaves an assignment pointing at deleted files.
    if (removedFileIds.length > 0) {
      await this.fileFacade.deleteFiles(removedFileIds);
    }
    return this.buildView(classId, updated, user);
  }

  /** UC-12: one assignment of a class, with its files and (for a student) their own submission. */
  async findOne(
    classId: string,
    assignmentId: string,
    user: AuthenticatedUser,
  ): Promise<AssignmentView> {
    await this.academicFacade.assertCanViewClass(classId, user);
    const isInClass = await this.contentFacade.isAssignmentInClass(
      classId,
      assignmentId,
    );
    const assignment = isInClass
      ? await this.assignmentRepository.findById(assignmentId)
      : null;
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }
    return this.buildView(classId, assignment, user);
  }

  /**
   * UC-34: removes the assignment from the class. When nothing else shows it and nobody has submitted,
   * the assignment and its attached files are deleted for good (S3 included); otherwise the data is kept,
   * so a student's work is never lost by hiding an assignment.
   */
  async remove(
    classId: string,
    assignmentId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    await this.academicFacade.assertCanManageClass(classId, user);
    const assignment = await this.assignmentRepository.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }
    const removedItems = await this.contentFacade.removeAssignmentFromClass(
      classId,
      assignmentId,
    );
    const isStillShown =
      await this.contentFacade.isAssignmentReferenced(assignmentId);
    if (removedItems === 0 && isStillShown) {
      throw new NotFoundException('Assignment not found in this class');
    }
    const hasSubmissions =
      (await this.submissionService.count(assignmentId)) > 0;
    if (isStillShown || hasSubmissions) return;
    const fileIds = await this.assignmentRepository.findFileIds(assignmentId);
    await this.assignmentRepository.deleteById(assignmentId);
    await this.fileFacade.deleteFiles(fileIds);
  }

  private async buildView(
    classId: string,
    assignment: Assignment,
    user: AuthenticatedUser,
  ): Promise<AssignmentView> {
    const fileIds = await this.assignmentRepository.findFileIds(assignment.id);
    const files = await this.fileFacade.getDownloadLinks(fileIds);
    const isStudent = user.role === Role.STUDENT;
    const mySubmission = isStudent
      ? await this.submissionService.findViewByStudent(assignment.id, user.id)
      : null;
    const submissionCount = isStudent
      ? 0
      : await this.submissionService.count(assignment.id);
    return AssignmentView.from(assignment, {
      classId,
      files,
      mySubmission,
      submissionCount,
      status: computeAssignmentStatus(assignment, mySubmission, new Date()),
    });
  }
}