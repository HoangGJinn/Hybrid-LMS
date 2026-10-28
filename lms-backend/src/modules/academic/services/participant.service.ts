import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClassStudentRepository } from '../repositories/class-student.repository.js';
import { ClassService } from './class.service.js';
import { AddParticipantDto } from '../dto/add-participant.dto.js';
import { ImportParticipantsDto } from '../dto/import-participants.dto.js';
import { Class } from '../entities/class.entity.js';
import {
  ParticipantCandidateView,
  ParticipantImportResult,
  ParticipantImportRowResult,
  ParticipantView,
} from '../types/participant-view.type.js';
import { UserFacade } from '../../user/facades/user.facade.js';
import { StudentSummary } from '../../user/types/student-summary.type.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { Role } from '../../../common/enums/role.enum.js';
import { isUniqueViolation } from '../../../common/utils/pg-error.util.js';

const DEFAULT_CANDIDATE_LIMIT = 20;
const MAX_CANDIDATE_LIMIT = 50;

/** An import row after trimming: student code in upper case, email in lower case. */
interface NormalizedImportRow {
  readonly line: number;
  readonly code: string | null;
  readonly email: string | null;
}

const emptyToNull = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed;
};

const unique = <T>(values: T[]): T[] => [...new Set(values)];

const notNull = <T>(value: T | null): value is T => value !== null;

/**
 * Manage Participants (UC-23), Add Participant (UC-24) and the bulk import of a class's student list.
 * Admins can manage every class; a lecturer only the classes they teach.
 */
@Injectable()
export class ParticipantService {
  constructor(
    private readonly classService: ClassService,
    private readonly participantRepo: ClassStudentRepository,
    private readonly userFacade: UserFacade,
  ) { }

  /** Participants of the class, optionally filtered by name, email or student code. */
  async list(
    classId: string,
    actor: AuthenticatedUser,
    search?: string,
  ): Promise<ParticipantView[]> {
    await this.loadManageableClass(classId, actor);
    const rows = await this.participantRepo.findByClass(
      classId,
      emptyToNull(search) ?? undefined,
    );
    return rows.map((row) => ParticipantView.fromEntity(row));
  }

  /** Students that can be picked in "Add Participant"; those already in the class are flagged. */
  async searchCandidates(
    classId: string,
    actor: AuthenticatedUser,
    search: string | undefined,
    limit: number = DEFAULT_CANDIDATE_LIMIT,
  ): Promise<ParticipantCandidateView[]> {
    await this.loadManageableClass(classId, actor);
    const boundedLimit = Math.min(Math.max(limit, 1), MAX_CANDIDATE_LIMIT);
    const [students, enrolled] = await Promise.all([
      this.userFacade.searchEnrollableStudents(
        emptyToNull(search) ?? undefined,
        boundedLimit,
      ),
      this.participantRepo.findStudentIds(classId),
    ]);
    return students.map((student) => ({
      studentId: student.userId,
      studentCode: student.studentCode,
      fullName: student.fullName,
      email: student.email,
      alreadyInClass: enrolled.has(student.userId),
    }));
  }

  /** UC-24. A student who is already in the class is a conflict (exception flow 3.1). */
  async add(
    classId: string,
    actor: AuthenticatedUser,
    dto: AddParticipantDto,
  ): Promise<ParticipantView> {
    const cls = await this.loadManageableClass(classId, actor);
    this.assertClassIsOpen(cls);

    const [student] = await this.userFacade.findStudentsByIds([dto.studentId]);
    if (!student) throw new NotFoundException('Student not found');
    if (student.enrollmentBlockedReason) {
      throw new BadRequestException(student.enrollmentBlockedReason);
    }
    if (await this.participantRepo.exists(classId, student.userId)) {
      throw this.alreadyParticipant(student);
    }
    try {
      await this.participantRepo.add(classId, student.userId);
    } catch (error) {
      // Lost a race with another request that added the same student.
      if (isUniqueViolation(error)) throw this.alreadyParticipant(student);
      throw error;
    }
    const created = await this.participantRepo.findOne(
      classId,
      student.userId,
    );
    if (!created) throw new NotFoundException('Participant not found');
    return ParticipantView.fromEntity(created);
  }

  /** Remove Participant (alternative of UC-23). Only the enrolment is removed, never the student. */
  async remove(
    classId: string,
    actor: AuthenticatedUser,
    studentId: string,
  ): Promise<void> {
    const cls = await this.loadManageableClass(classId, actor);
    this.assertClassIsOpen(cls);
    const removed = await this.participantRepo.remove(classId, studentId);
    if (!removed) {
      throw new NotFoundException(
        'This student is not a participant of the class',
      );
    }
  }

  /**
   * Adds the students named in an import file. Valid rows are added even when other rows fail;
   * every row gets a result. With `dryRun` nothing is written (preview).
   */
  async importParticipants(
    classId: string,
    actor: AuthenticatedUser,
    dto: ImportParticipantsDto,
  ): Promise<ParticipantImportResult> {
    const cls = await this.loadManageableClass(classId, actor);
    this.assertClassIsOpen(cls);
    const dryRun = dto.dryRun ?? false;

    const rows: NormalizedImportRow[] = dto.rows.map((row) => ({
      line: row.line,
      code: emptyToNull(row.studentCode)?.toUpperCase() ?? null,
      email: emptyToNull(row.email)?.toLowerCase() ?? null,
    }));
    const codes = unique(rows.map((row) => row.code).filter(notNull));
    const emails = unique(rows.map((row) => row.email).filter(notNull));

    const [byCode, byEmail, enrolled] = await Promise.all([
      this.userFacade.findStudentsByCodes(codes),
      this.userFacade.findStudentsByEmails(emails),
      this.participantRepo.findStudentIds(classId),
    ]);
    const codeIndex = new Map(
      byCode.map((s): [string, StudentSummary] => [
        s.studentCode.toUpperCase(),
        s,
      ]),
    );
    const emailIndex = new Map(
      byEmail.map((s): [string, StudentSummary] => [s.email.toLowerCase(), s]),
    );

    const seen = new Set<string>();
    const toAdd: string[] = [];
    const results = rows.map((row): ParticipantImportRowResult => {
      const outcome = this.resolveImportRow(row, codeIndex, emailIndex);
      if (outcome.status === 'error') return outcome.result;
      const { student } = outcome;
      if (enrolled.has(student.userId)) {
        return this.rowResult(row, 'skipped', student, 'Already a participant');
      }
      if (seen.has(student.userId)) {
        return this.rowResult(
          row,
          'skipped',
          student,
          'Duplicate of an earlier row in the file',
        );
      }
      seen.add(student.userId);
      toAdd.push(student.userId);
      return this.rowResult(row, 'added', student, null);
    });

    if (!dryRun) await this.participantRepo.addMany(classId, toAdd);

    const count = (status: ParticipantImportRowResult['status']): number =>
      results.filter((result) => result.status === status).length;
    return {
      dryRun,
      total: results.length,
      added: count('added'),
      skipped: count('skipped'),
      failed: count('error'),
      rows: results,
    };
  }

  /** Finds the student a row points at, or explains why the row is unusable. */
  private resolveImportRow(
    row: NormalizedImportRow,
    codeIndex: Map<string, StudentSummary>,
    emailIndex: Map<string, StudentSummary>,
  ):
    | { status: 'found'; student: StudentSummary }
    | { status: 'error'; result: ParticipantImportRowResult } {
    const error = (
      message: string,
      student?: StudentSummary,
    ): { status: 'error'; result: ParticipantImportRowResult } => ({
      status: 'error',
      result: this.rowResult(row, 'error', student, message),
    });

    let student: StudentSummary | undefined;
    if (row.code) {
      student = codeIndex.get(row.code);
      if (!student) return error(`No student with code ${row.code}`);
      if (row.email && student.email.toLowerCase() !== row.email) {
        return error(
          'The student code and the email belong to different students',
          student,
        );
      }
    } else if (row.email) {
      student = emailIndex.get(row.email);
      if (!student) return error(`No student with email ${row.email}`);
    } else {
      return error('Provide a student code or an email');
    }
    if (student.enrollmentBlockedReason) {
      return error(student.enrollmentBlockedReason, student);
    }
    return { status: 'found', student };
  }

  private rowResult(
    row: NormalizedImportRow,
    status: ParticipantImportRowResult['status'],
    student: StudentSummary | undefined,
    message: string | null,
  ): ParticipantImportRowResult {
    return {
      line: row.line,
      status,
      studentCode: student?.studentCode ?? row.code,
      fullName: student?.fullName ?? null,
      message,
    };
  }

  private alreadyParticipant(student: StudentSummary): ConflictException {
    return new ConflictException(
      `${student.fullName} (${student.studentCode}) is already a participant of this class`,
    );
  }

  /** Admin: any class. Lecturer: only a class they teach. */
  private async loadManageableClass(
    classId: string,
    actor: AuthenticatedUser,
  ): Promise<Class> {
    const cls = await this.classService.findById(classId);
    if (actor.role === Role.ADMIN) return cls;
    if (actor.role === Role.LECTURER && cls.lecturerId === actor.id) return cls;
    throw new ForbiddenException(
      'You can only manage the participants of your own classes',
    );
  }

  /** Participants are frozen once a class has ended, like the rest of the class. */
  private assertClassIsOpen(cls: Class): void {
    if (!cls.isActive) {
      throw new ConflictException(
        'This class has ended, so its participants can no longer be changed',
      );
    }
  }
}
