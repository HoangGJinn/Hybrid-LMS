import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { normalizeExtension } from '../../../shared/file/constants/upload-rules.constant.js';
import { FileFacade } from '../../../shared/file/facades/file.facade.js';
import { AcademicFacade } from '../../academic/facades/academic.facade.js';
import { ContentFacade } from '../../content/facades/content.facade.js';
import type { SubmitAssignmentDto } from '../dto/submit-assignment.dto.js';
import type { Assignment } from '../entities/assignment.entity.js';
import { SubmissionType } from '../enums/submission-type.enum.js';
import { AssignmentRepository } from '../repositories/assignment.repository.js';
import { SubmissionRepository } from '../repositories/submission.repository.js';
import { SubmissionView } from '../types/submission-view.type.js';

/** Business rules for handing in and editing a submission. */
@Injectable()
export class SubmissionService {
  constructor(
    private readonly submissionRepository: SubmissionRepository,
    private readonly assignmentRepository: AssignmentRepository,
    private readonly academicFacade: AcademicFacade,
    private readonly contentFacade: ContentFacade,
    private readonly fileFacade: FileFacade,
  ) {}

  /**
   * UC-16 / UC-17: hands in, or edits, the student's submission. Only while the assignment is open:
   * after the deadline (or before it opens) nothing can be submitted or changed.
   * The work must match the assignment: an online answer for TEXT, files of the accepted formats for FILE.
   * A graded submission is locked. Files dropped by an edit are deleted from S3 for good.
   */
  async submit(
    classId: string,
    assignmentId: string,
    dto: SubmitAssignmentDto,
    user: AuthenticatedUser,
    now: Date = new Date(),
  ): Promise<SubmissionView> {
    await this.academicFacade.assertCanViewClass(classId, user);
    const assignment = await this.findInClass(classId, assignmentId);
    this.assertOpen(assignment, now);
    await this.fileFacade.assertOwnedReadyFiles(dto.fileIds, user.id);
    await this.assertMatchesRules(assignment, dto);
    const existing = await this.submissionRepository.findByStudent(
      assignmentId,
      user.id,
    );
    if (existing && existing.score !== null) {
      throw new BadRequestException(
        'This submission is already graded and can no longer be edited',
      );
    }
    const previousFileIds = existing
      ? await this.submissionRepository.findFileIds(existing.id)
      : [];
    const answerText =
      assignment.submissionType === SubmissionType.TEXT
        ? (dto.answerText?.trim() ?? null)
        : null;
    const submission = await this.submissionRepository.save(
      assignmentId,
      user.id,
      dto.fileIds,
      answerText,
      now,
    );
    const droppedFileIds = previousFileIds.filter(
      (id) => !dto.fileIds.includes(id),
    );
    await this.fileFacade.deleteFiles(droppedFileIds);
    const files = await this.fileFacade.getDownloadLinks(dto.fileIds);
    return SubmissionView.from(submission, files);
  }

  /** The student's own submission with signed file links, or null when they have not submitted. */
  async findViewByStudent(
    assignmentId: string,
    studentId: string,
  ): Promise<SubmissionView | null> {
    const submission = await this.submissionRepository.findByStudent(
      assignmentId,
      studentId,
    );
    if (!submission) return null;
    const fileIds = await this.submissionRepository.findFileIds(submission.id);
    const files = await this.fileFacade.getDownloadLinks(fileIds);
    return SubmissionView.from(submission, files);
  }

  async count(assignmentId: string): Promise<number> {
    return this.submissionRepository.count(assignmentId);
  }

  private async findInClass(
    classId: string,
    assignmentId: string,
  ): Promise<Assignment> {
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
    return assignment;
  }

  private assertOpen(assignment: Assignment, now: Date): void {
    if (now < assignment.openAt) {
      throw new BadRequestException('This assignment is not open yet');
    }
    if (now > assignment.endAt) {
      throw new BadRequestException('The deadline has passed');
    }
  }

  /** The submitted work must be of the kind the assignment asks for. */
  private async assertMatchesRules(
    assignment: Assignment,
    dto: SubmitAssignmentDto,
  ): Promise<void> {
    if (assignment.submissionType === SubmissionType.TEXT) {
      if (!dto.answerText?.trim()) {
        throw new BadRequestException('Write your answer before submitting');
      }
      if (dto.fileIds.length > 0) {
        throw new BadRequestException('This assignment does not accept files');
      }
      return;
    }
    if (dto.fileIds.length === 0) {
      throw new BadRequestException('Attach at least one file');
    }
    const accepted = assignment.acceptedExtensions;
    if (accepted.length === 0) return;
    const files = await this.fileFacade.getDownloadLinks(dto.fileIds);
    const rejected = files.find(
      (file) => !accepted.includes(normalizeExtension(file.fileName)),
    );
    if (rejected) {
      const list = accepted.map((extension) => `.${extension}`).join(', ');
      throw new BadRequestException(
        `${rejected.fileName}: only ${list} files are accepted`,
      );
    }
  }
}