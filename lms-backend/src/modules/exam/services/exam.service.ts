import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '../../../common/utils/pg-error.util.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { FileFacade } from '../../../shared/file/facades/file.facade.js';
import { FilePurpose } from '../../../shared/file/enums/file-purpose.enum.js';
import { AcademicFacade } from '../../academic/facades/academic.facade.js';
import { ContentFacade } from '../../content/facades/content.facade.js';
import {
  MS_PER_MINUTE,
  MAX_OPTIONS,
  MIN_OPTIONS,
} from '../constants/exam-rules.constant.js';
import type {
  CreateExamDto,
  CreateExamQuestionDto,
  UpdateExamDto,
  UpdateExamScheduleDto,
} from '../dto/create-exam.dto.js';
import type { ExamSchedule } from '../entities/exam-schedule.entity.js';
import { ExamFormat } from '../enums/exam-format.enum.js';
import { ExamStatus } from '../enums/exam-status.enum.js';
import {
  ExamRepository,
  type ExamUpdate,
  type ExamUpdateResult,
} from '../repositories/exam.repository.js';
import { ExamQuestionView } from '../types/exam-question-view.type.js';
import { ExamView } from '../types/exam-view.type.js';
import { isContentLocked, resolveExamStatus } from '../utils/exam-status.util.js';

const CONTENT_LOCKED_MESSAGE =
  'The questions, answers and question file can no longer be changed: the exam has opened or a student has started it';

/** Business rules for creating, viewing and removing the exams of a class. */
@Injectable()
export class ExamService {
  private readonly logger = new Logger(ExamService.name);

  constructor(
    private readonly examRepository: ExamRepository,
    private readonly academicFacade: AcademicFacade,
    private readonly contentFacade: ContentFacade,
    private readonly fileFacade: FileFacade,
  ) {}

  /**
   * UC-31: creates an exam from typed multiple-choice questions or a confirmed question file.
   * The lecturer then places it in a section and saves the editor, which is what shows it to students.
   * Nothing is stored unless everything is valid, and the exam, its questions and answers are saved together.
   */
  async create(
    classId: string,
    dto: CreateExamDto,
    user: AuthenticatedUser,
    now: Date = new Date(),
  ): Promise<ExamView> {
    await this.academicFacade.assertCanManageClass(classId, user);
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    this.assertValidSchedule(startTime, endTime, dto.durationMinutes, now);
    const questions = this.assertValidContent(dto);
    if (dto.format === ExamFormat.FILE) {
      await this.fileFacade.assertOwnedReadyFileOfPurpose(
        dto.fileId as string,
        user.id,
        FilePurpose.EXAM,
      );
    }
    const exam = await this.saveExam(classId, dto, startTime, endTime, questions);
    return this.buildView(exam, now);
  }

  /** One exam of the class with its correct answers; for the class lecturer or an admin, never for students. */
  async findOne(
    classId: string,
    examId: string,
    user: AuthenticatedUser,
    now: Date = new Date(),
  ): Promise<ExamView> {
    await this.academicFacade.assertCanManageClass(classId, user);
    const exam = await this.findInClass(classId, examId);
    return this.buildView(exam, now);
  }

  /**
   * Replaces the whole exam while nobody has seen it: it must still be upcoming and have no session. The
   * decision is made under a row lock, so a student starting at the same moment cannot slip through. A
   * question file that is replaced or dropped is deleted from storage only after the change is committed.
   */
  async update(
    classId: string,
    examId: string,
    dto: UpdateExamDto,
    user: AuthenticatedUser,
    now: Date = new Date(),
  ): Promise<ExamView> {
    await this.academicFacade.assertCanManageClass(classId, user);
    const before = await this.findInClass(classId, examId);
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    this.assertValidSchedule(startTime, endTime, dto.durationMinutes, now);
    const questions = this.assertValidContent(dto);
    const fileId = dto.format === ExamFormat.FILE ? (dto.fileId as string) : null;
    // Keeping the file the exam already has needs no new check; anything else must be a fresh, valid upload.
    if (fileId && fileId !== before.fileQuestionId) {
      await this.fileFacade.assertOwnedReadyFileOfPurpose(
        fileId,
        user.id,
        FilePurpose.EXAM,
      );
    }
    const result = await this.saveChange(examId, (current, startedCount) => {
      const status = resolveExamStatus(current, now);
      if (isContentLocked(status, startedCount)) {
        throw new ConflictException(CONTENT_LOCKED_MESSAGE);
      }
      return {
        examName: dto.examName,
        startTime,
        endTime,
        durationMinutes: dto.durationMinutes,
        content: { format: dto.format, fileQuestionId: fileId, questions },
      };
    });
    await this.discardReplacedFile(result.previousFileId, result.exam.fileQuestionId);
    return this.buildView(result.exam, now);
  }

  /**
   * Changes the name, the closing time and the duration. Before the exam is locked any valid schedule is
   * accepted. Once it has opened or been started, the closing time and the duration may only grow, so nobody
   * who started earlier is treated better or worse than someone who starts later. A closed exam keeps its
   * schedule and only its name can change.
   */
  async updateSchedule(
    classId: string,
    examId: string,
    dto: UpdateExamScheduleDto,
    user: AuthenticatedUser,
    now: Date = new Date(),
  ): Promise<ExamView> {
    await this.academicFacade.assertCanManageClass(classId, user);
    await this.findInClass(classId, examId);
    const result = await this.saveChange(examId, (current, startedCount) => {
      const endTime = dto.endTime ? new Date(dto.endTime) : current.endTime;
      const durationMinutes = dto.durationMinutes ?? current.durationMinutes;
      this.assertScheduleChangeAllowed(
        current,
        endTime,
        durationMinutes,
        startedCount,
        now,
      );
      return {
        examName: dto.examName ?? current.examName,
        startTime: current.startTime,
        endTime,
        durationMinutes,
      };
    });
    return this.buildView(result.exam, now);
  }

  /**
   * UC-32: removes the exam from the class's sections, so students no longer see it. When nothing else shows
   * it and nobody has started it, the exam, its questions and its question file are deleted for good (S3
   * included); once a student has a session the data is kept, so their work and score are never lost.
   */
  async remove(
    classId: string,
    examId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    await this.academicFacade.assertCanManageClass(classId, user);
    const exam = await this.findInClass(classId, examId);
    await this.contentFacade.removeExamFromClass(classId, examId);
    const isStillShown = await this.contentFacade.isExamReferenced(examId);
    if (isStillShown || (await this.examRepository.hasSessions(examId))) return;
    try {
      await this.examRepository.deleteById(examId);
    } catch (error) {
      if (!isForeignKeyViolation(error)) throw error;
      this.logger.warn(`Exam ${examId} kept: a student session still uses it`);
      return;
    }
    if (exam.fileQuestionId) {
      await this.fileFacade.deleteFile(exam.fileQuestionId);
    }
  }

  /** An exam of another class looks exactly like a missing exam, so ids cannot be probed. */
  private async findInClass(
    classId: string,
    examId: string,
  ): Promise<ExamSchedule> {
    const exam = await this.examRepository.findById(examId);
    if (!exam || exam.classId !== classId) {
      throw new NotFoundException('Exam not found');
    }
    return exam;
  }

  private async saveExam(
    classId: string,
    dto: CreateExamDto,
    startTime: Date,
    endTime: Date,
    questions: CreateExamQuestionDto[],
  ): Promise<ExamSchedule> {
    try {
      return await this.examRepository.create({
        classId,
        examName: dto.examName,
        startTime,
        endTime,
        durationMinutes: dto.durationMinutes,
        format: dto.format,
        fileQuestionId: dto.format === ExamFormat.FILE ? (dto.fileId ?? null) : null,
        questions,
      });
    } catch (error) {
      // The unique index on file_question_id: a question file belongs to one exam only.
      if (isUniqueViolation(error)) {
        throw new BadRequestException('This file is already used by another exam');
      }
      throw error;
    }
  }

  /** Runs a locked update; maps a missing exam to 404 and a taken question file to 400. */
  private async saveChange(
    examId: string,
    build: (current: ExamSchedule, startedCount: number) => ExamUpdate,
  ): Promise<ExamUpdateResult> {
    let result: ExamUpdateResult | null;
    try {
      result = await this.examRepository.update(examId, build);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('This file is already used by another exam');
      }
      throw error;
    }
    if (!result) throw new NotFoundException('Exam not found');
    return result;
  }

  /** The old question file is useless once the exam points elsewhere; a storage failure must not undo the saved change. */
  private async discardReplacedFile(
    previousFileId: string | null,
    currentFileId: string | null,
  ): Promise<void> {
    if (!previousFileId || previousFileId === currentFileId) return;
    try {
      await this.fileFacade.deleteFile(previousFileId);
    } catch (error) {
      this.logger.warn(`Replaced question file ${previousFileId} was not deleted: ${String(error)}`);
    }
  }

  private assertScheduleChangeAllowed(
    current: ExamSchedule,
    endTime: Date,
    durationMinutes: number,
    startedCount: number,
    now: Date,
  ): void {
    const status = resolveExamStatus(current, now);
    if (status === ExamStatus.CLOSED) {
      const isUnchanged =
        endTime.getTime() === current.endTime.getTime() &&
        durationMinutes === current.durationMinutes;
      if (!isUnchanged) {
        throw new ConflictException(
          'This exam is closed; only its name can be changed',
        );
      }
      return;
    }
    if (!isContentLocked(status, startedCount)) {
      this.assertValidSchedule(current.startTime, endTime, durationMinutes, now);
      return;
    }
    if (endTime < current.endTime) {
      throw new BadRequestException(
        'The closing time can only be moved later once the exam has opened',
      );
    }
    if (durationMinutes < current.durationMinutes) {
      throw new BadRequestException(
        'The duration can only be made longer once the exam has opened',
      );
    }
    this.assertDurationFitsWindow(current.startTime, endTime, durationMinutes);
  }

  private assertValidSchedule(
    startTime: Date,
    endTime: Date,
    durationMinutes: number,
    now: Date,
  ): void {
    if (endTime <= startTime) {
      throw new BadRequestException('The end time must be after the start time');
    }
    if (endTime <= now) {
      throw new BadRequestException('The end time must be in the future');
    }
    this.assertDurationFitsWindow(startTime, endTime, durationMinutes);
  }

  private assertDurationFitsWindow(
    startTime: Date,
    endTime: Date,
    durationMinutes: number,
  ): void {
    const windowMinutes = (endTime.getTime() - startTime.getTime()) / MS_PER_MINUTE;
    if (durationMinutes > windowMinutes) {
      throw new BadRequestException(
        'The duration cannot be longer than the time between the start and the end',
      );
    }
  }

  /** Checks that the exam carries exactly what its format needs, and returns its (possibly empty) questions. */
  private assertValidContent(dto: CreateExamDto): CreateExamQuestionDto[] {
    const questions = dto.questions ?? [];
    if (dto.format === ExamFormat.FILE) {
      if (questions.length > 0) {
        throw new BadRequestException(
          'An exam with a question file cannot also have typed questions',
        );
      }
      if (!dto.fileId) {
        throw new BadRequestException('Upload the question file of the exam');
      }
      return [];
    }
    if (dto.fileId) {
      throw new BadRequestException(
        'A multiple-choice exam cannot have a question file',
      );
    }
    if (questions.length === 0) {
      throw new BadRequestException('Add at least one question');
    }
    questions.forEach((question, index) =>
      this.assertValidQuestion(question, index + 1),
    );
    return questions;
  }

  private assertValidQuestion(
    question: CreateExamQuestionDto,
    position: number,
  ): void {
    if (
      question.options.length < MIN_OPTIONS ||
      question.options.length > MAX_OPTIONS
    ) {
      throw new BadRequestException(
        `Question ${position} needs ${MIN_OPTIONS} to ${MAX_OPTIONS} answers`,
      );
    }
    const correctCount = question.options.filter((option) => option.isCorrect).length;
    if (correctCount !== 1) {
      throw new BadRequestException(
        `Question ${position} needs exactly one correct answer`,
      );
    }
    const distinct = new Set(
      question.options.map((option) => option.content.trim().toLowerCase()),
    );
    if (distinct.size !== question.options.length) {
      throw new BadRequestException(`Question ${position} has duplicate answers`);
    }
  }

  private async buildView(exam: ExamSchedule, now: Date): Promise<ExamView> {
    const content = await this.examRepository.findContent(exam.id);
    const startedCount = await this.examRepository.countSessions(exam.id);
    const status = resolveExamStatus(exam, now);
    const questions = content.questions.map((question) =>
      ExamQuestionView.fromEntity(
        question,
        content.optionsByQuestionId.get(question.id) ?? [],
      ),
    );
    const [file = null] = exam.fileQuestionId
      ? await this.fileFacade.getDownloadLinks([exam.fileQuestionId])
      : [];
    return ExamView.from(exam, {
      questions,
      file,
      status,
      startedCount,
      isContentLocked: isContentLocked(status, startedCount),
    });
  }
}
