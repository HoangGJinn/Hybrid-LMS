import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { isUniqueViolation } from '../../../common/utils/pg-error.util.js';
import { FileFacade } from '../../../shared/file/facades/file.facade.js';
import { AcademicFacade } from '../../academic/facades/academic.facade.js';
import { ContentFacade } from '../../content/facades/content.facade.js';
import type {
  ExamAnswerInputDto,
  SaveExamAnswersDto,
  SubmitExamSessionDto,
  SubmitFileExamDto,
} from '../dto/student-exam.dto.js';
import type { ExamSchedule } from '../entities/exam-schedule.entity.js';
import type { ExamSession } from '../entities/exam-session.entity.js';
import { ExamFormat } from '../enums/exam-format.enum.js';
import { ExamSessionStatus } from '../enums/exam-session-status.enum.js';
import { ExamStatus } from '../enums/exam-status.enum.js';
import {
  type ExamContent,
  ExamRepository,
} from '../repositories/exam.repository.js';
import {
  ExamSessionRepository,
  type SessionAnswerWrite,
} from '../repositories/exam-session.repository.js';
import type {
  ExamAttemptReviewView,
  ExamAttemptView,
  ExamReviewQuestionView,
  SaveExamAnswersResultView,
  SaveFileSubmissionResultView,
  StudentExamAttemptItemView,
  StudentExamLobbyView,
  StudentExamQuestionView,
  StudentExamSummaryView,
  SubmitExamResultView,
} from '../types/student-exam-view.type.js';
import {
  computeSessionDeadline,
  isPastDeadlineWithGrace,
} from '../utils/exam-deadline.util.js';
import {
  type GradeSummary,
  gradeMultipleChoiceAttempt,
} from '../utils/exam-grading.util.js';
import { shuffleWithSeed } from '../utils/exam-shuffle.util.js';
import {
  resolveExamMaxAttempts,
  resolveExamStatus,
} from '../utils/exam-status.util.js';

const toNumberOrNull = (value: number | string | null): number | null =>
  value === null || value === undefined ? null : Number(value);

/** Business rules for students viewing, starting, auto-saving, submitting and reviewing exams. */
@Injectable()
export class StudentExamService {
  constructor(
    private readonly examRepository: ExamRepository,
    private readonly sessionRepository: ExamSessionRepository,
    private readonly academicFacade: AcademicFacade,
    private readonly contentFacade: ContentFacade,
    private readonly fileFacade: FileFacade,
  ) {}

  /** Lists all section-linked exams across the signed-in student's classes with their attempt summary. */
  async myExams(
    user: AuthenticatedUser,
    now: Date = new Date(),
  ): Promise<StudentExamSummaryView[]> {
    const classes = await this.academicFacade.getClassesByStudent(user.id);
    const links = await this.contentFacade.findExamsByClasses(
      classes.map((cls) => cls.id),
    );
    const exams = await this.examRepository.findByIds(
      links.map((link) => link.examId),
    );
    const sessions = await this.sessionRepository.findByStudentInExams(
      user.id,
      exams.map((exam) => exam.id),
    );
    const examById = new Map(exams.map((exam) => [exam.id, exam]));
    const finalized = await this.finalizeExpiredSessions(sessions, examById, now);
    return exams.map((exam) =>
      this.toSummaryView(
        exam,
        finalized.filter((s) => s.examScheduleId === exam.id),
        now,
      ),
    );
  }

  /** Returns the student's lobby overview and attempt history for one exam in a class. */
  async getLobby(
    classId: string,
    examId: string,
    user: AuthenticatedUser,
    now: Date = new Date(),
  ): Promise<StudentExamLobbyView> {
    await this.academicFacade.assertCanViewClass(classId, user);
    const exam = await this.findVisibleExamInClass(classId, examId);
    const sessions = await this.loadAndFinalizeStudentSessions(
      exam,
      user.id,
      now,
    );
    const questionCount = await this.examRepository.countQuestions(exam.id);
    return this.buildLobbyView(exam, sessions, questionCount, now);
  }

  /**
   * Starts a new attempt or resumes the student's active `IN_PROGRESS` attempt (idempotent)
   * for both MULTIPLE_CHOICE and FILE exams.
   */
  async startOrResume(
    classId: string,
    examId: string,
    user: AuthenticatedUser,
    now: Date = new Date(),
  ): Promise<ExamAttemptView> {
    await this.academicFacade.assertCanViewClass(classId, user);
    const exam = await this.findVisibleExamInClass(classId, examId);
    const sessions = await this.loadAndFinalizeStudentSessions(
      exam,
      user.id,
      now,
    );
    const { session, attemptNumber } = await this.resolveOrCreateSession(
      exam,
      sessions,
      user.id,
      now,
    );
    return this.buildAttemptView(exam, session, attemptNumber, now);
  }

  /**
   * Batch auto-saves answers for an in-progress attempt and returns the latest server-computed deadline
   * so any schedule extension by the lecturer is reflected on the student's timer immediately.
   */
  async saveAnswers(
    sessionId: string,
    dto: SaveExamAnswersDto,
    user: AuthenticatedUser,
    now: Date = new Date(),
  ): Promise<SaveExamAnswersResultView> {
    const { session, exam } = await this.findOwnedSessionAndExam(
      sessionId,
      user.id,
    );
    if (session.status !== ExamSessionStatus.IN_PROGRESS) {
      throw new ConflictException('This attempt has already been submitted');
    }
    const deadline = computeSessionDeadline(exam, session.startedAt);
    if (isPastDeadlineWithGrace(deadline, now)) {
      await this.finalizeExpiredSession(exam, session, deadline);
      throw new ConflictException(
        'Time is up; your attempt has been submitted automatically',
      );
    }
    if (dto.answers.length === 0) {
      return {
        savedQuestionIds: [],
        savedAt: now,
        deadline,
        serverNow: now,
      };
    }
    const content = await this.examRepository.findContent(exam.id);
    const writes = this.validateAnswerWrites(dto.answers, content);
    await this.sessionRepository.saveAnswers(session.id, writes, now);
    return {
      savedQuestionIds: writes.map((item) => item.questionId),
      savedAt: now,
      deadline,
      serverNow: now,
    };
  }

  /**
   * Saves or updates the student's uploaded submission files for a FILE-format exam attempt.
   * While `now <= deadline` and the lecturer has not graded the session yet, the student may
   * replace/add/remove files and re-submit as many times as needed.
   */
  async saveFileSubmission(
    sessionId: string,
    dto: SubmitFileExamDto,
    user: AuthenticatedUser,
    now: Date = new Date(),
  ): Promise<SaveFileSubmissionResultView> {
    const { session, exam } = await this.findOwnedSessionAndExam(
      sessionId,
      user.id,
    );
    if (exam.format !== ExamFormat.FILE) {
      throw new BadRequestException(
        'File submission is only available for file-based exams',
      );
    }
    if (
      session.status !== ExamSessionStatus.IN_PROGRESS ||
      session.gradedAt !== null
    ) {
      throw new ConflictException('This attempt can no longer be edited');
    }
    const deadline = computeSessionDeadline(exam, session.startedAt);
    if (isPastDeadlineWithGrace(deadline, now)) {
      await this.finalizeExpiredSession(exam, session, deadline);
      throw new ConflictException(
        'Time is up; your attempt has been finalized automatically',
      );
    }
    await this.fileFacade.assertOwnedReadyFiles(dto.fileIds, user.id);
    const previousFileIds = await this.sessionRepository.findFileIds(session.id);
    const updated = await this.sessionRepository.saveSessionFiles(
      session.id,
      dto.fileIds,
      now,
    );
    const removedFileIds = previousFileIds.filter(
      (id) => !dto.fileIds.includes(id),
    );
    if (removedFileIds.length > 0) {
      await this.fileFacade.deleteFiles(removedFileIds);
    }
    const submittedFiles = await this.fileFacade.getDownloadLinks(dto.fileIds);
    return {
      sessionId: updated.id,
      submittedAt: updated.submittedAt ?? now,
      submittedFiles,
      deadline,
      serverNow: now,
    };
  }

  /**
   * Finalizes the student's attempt, saving any remaining answers sent with the request (when still within
   * the grace window), grading the attempt on a 10-point scale, and returning the submission summary.
   */
  async submit(
    sessionId: string,
    dto: SubmitExamSessionDto,
    user: AuthenticatedUser,
    now: Date = new Date(),
  ): Promise<SubmitExamResultView> {
    const { session, exam } = await this.findOwnedSessionAndExam(
      sessionId,
      user.id,
    );
    const allSessions = await this.sessionRepository.findByStudentAndExam(
      exam.id,
      user.id,
    );
    const attemptNumber = Math.max(
      1,
      allSessions.findIndex((item) => item.id === session.id) + 1,
    );
    const content = await this.examRepository.findContent(exam.id);
    if (session.status === ExamSessionStatus.COMPLETED) {
      return this.buildSubmitResult(exam, session, attemptNumber, content);
    }
    const deadline = computeSessionDeadline(exam, session.startedAt);
    const isExpired = isPastDeadlineWithGrace(deadline, now);
    if (!isExpired && dto.answers && dto.answers.length > 0) {
      const writes = this.validateAnswerWrites(dto.answers, content);
      await this.sessionRepository.saveAnswers(session.id, writes, now);
    }
    const endedAt = now.getTime() > deadline.getTime() ? deadline : now;
    const finalized = await this.gradeAndFinalizeWithContent(
      session,
      content,
      endedAt,
    );
    return this.buildSubmitResult(exam, finalized, attemptNumber, content);
  }

  /** Full review of a completed (or submitted FILE) attempt when `exam.showResults` is enabled. */
  async review(
    sessionId: string,
    user: AuthenticatedUser,
    now: Date = new Date(),
  ): Promise<ExamAttemptReviewView> {
    const { session, exam } = await this.findOwnedSessionAndExam(
      sessionId,
      user.id,
    );
    const allSessions = await this.loadAndFinalizeStudentSessions(
      exam,
      user.id,
      now,
    );
    const index = allSessions.findIndex((item) => item.id === session.id);
    const current = index >= 0 ? allSessions[index] : session;
    const isReviewableFileAttempt =
      exam.format === ExamFormat.FILE && current.submittedAt !== null;
    if (
      current.status !== ExamSessionStatus.COMPLETED &&
      !isReviewableFileAttempt
    ) {
      throw new BadRequestException('Finish the attempt before reviewing it');
    }
    if (!(exam.showResults ?? true)) {
      throw new ForbiddenException(
        'Results and correct answers are hidden for this exam',
      );
    }
    return this.buildReviewView(exam, current, Math.max(1, index + 1));
  }

  /**
   * Lazily finalizes all expired `IN_PROGRESS` attempts across all students of an exam.
   * Used when a lecturer views or exports exam results so students who closed their browser tab
   * still have their saved answers graded automatically once their timer expires.
   */
  async finalizeExpiredSessionsForExam(
    exam: ExamSchedule,
    now: Date = new Date(),
  ): Promise<ExamSession[]> {
    const sessions = await this.sessionRepository.findByExam(exam.id);
    return this.finalizeExpiredSessions(
      sessions,
      new Map([[exam.id, exam]]),
      now,
    );
  }

  private async findVisibleExamInClass(
    classId: string,
    examId: string,
  ): Promise<ExamSchedule> {
    const isShown = await this.contentFacade.isExamInClass(classId, examId);
    const exam = isShown ? await this.examRepository.findById(examId) : null;
    if (!exam || exam.classId !== classId) {
      throw new NotFoundException('Exam not found');
    }
    return exam;
  }

  private async findOwnedSessionAndExam(
    sessionId: string,
    studentId: string,
  ): Promise<{ readonly session: ExamSession; readonly exam: ExamSchedule }> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session || session.studentId !== studentId) {
      throw new NotFoundException('Exam session not found');
    }
    const exam = await this.examRepository.findById(session.examScheduleId);
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }
    return { session, exam };
  }

  private async loadAndFinalizeStudentSessions(
    exam: ExamSchedule,
    studentId: string,
    now: Date,
  ): Promise<ExamSession[]> {
    const sessions = await this.sessionRepository.findByStudentAndExam(
      exam.id,
      studentId,
    );
    return this.finalizeExpiredSessions(
      sessions,
      new Map([[exam.id, exam]]),
      now,
    );
  }

  /** Lazily finalizes any `IN_PROGRESS` session whose deadline + grace period has elapsed. */
  private async finalizeExpiredSessions(
    sessions: readonly ExamSession[],
    examById: ReadonlyMap<string, ExamSchedule>,
    now: Date,
  ): Promise<ExamSession[]> {
    const results: ExamSession[] = [];
    for (const session of sessions) {
      const exam = examById.get(session.examScheduleId);
      if (
        session.status === ExamSessionStatus.IN_PROGRESS &&
        exam &&
        isPastDeadlineWithGrace(
          computeSessionDeadline(exam, session.startedAt),
          now,
        )
      ) {
        const deadline = computeSessionDeadline(exam, session.startedAt);
        results.push(await this.finalizeExpiredSession(exam, session, deadline));
      } else {
        results.push(session);
      }
    }
    return results;
  }

  private async finalizeExpiredSession(
    exam: ExamSchedule,
    session: ExamSession,
    endedAt: Date,
  ): Promise<ExamSession> {
    if (exam.format === ExamFormat.FILE) {
      return this.sessionRepository.finalizeSession(session.id, {
        score: toNumberOrNull(session.score),
        endedAt,
      });
    }
    return this.gradeAndFinalize(exam.id, session, endedAt);
  }

  private async gradeAndFinalize(
    examId: string,
    session: ExamSession,
    endedAt: Date,
  ): Promise<ExamSession> {
    const content = await this.examRepository.findContent(examId);
    return this.gradeAndFinalizeWithContent(session, content, endedAt);
  }

  private async gradeAndFinalizeWithContent(
    session: ExamSession,
    content: ExamContent,
    endedAt: Date,
  ): Promise<ExamSession> {
    const answers = await this.sessionRepository.findAnswers(session.id);
    const grade = this.computeGrade(content, answers);
    return this.sessionRepository.finalizeSession(session.id, {
      score: grade.score,
      endedAt,
    });
  }

  private computeGrade(
    content: ExamContent,
    answers: ReadonlyMap<string, string>,
  ): GradeSummary {
    const gradable = content.questions.map((question) => {
      const options = content.optionsByQuestionId.get(question.id) ?? [];
      const correct = options.find((option) => option.isCorrect);
      return { id: question.id, correctOptionId: correct?.id ?? null };
    });
    return gradeMultipleChoiceAttempt(gradable, answers);
  }

  private async resolveOrCreateSession(
    exam: ExamSchedule,
    sessions: readonly ExamSession[],
    studentId: string,
    now: Date,
  ): Promise<{ readonly session: ExamSession; readonly attemptNumber: number }> {
    const activeIndex = sessions.findIndex(
      (item) => item.status === ExamSessionStatus.IN_PROGRESS,
    );
    if (activeIndex >= 0) {
      return { session: sessions[activeIndex], attemptNumber: activeIndex + 1 };
    }
    this.assertCanStartNewAttempt(exam, sessions, now);
    try {
      const created = await this.sessionRepository.createSession(
        exam.id,
        studentId,
        now,
      );
      return { session: created, attemptNumber: sessions.length + 1 };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const latest = await this.sessionRepository.findByStudentAndExam(
        exam.id,
        studentId,
      );
      const foundIndex = latest.findIndex(
        (item) => item.status === ExamSessionStatus.IN_PROGRESS,
      );
      if (foundIndex >= 0) {
        return { session: latest[foundIndex], attemptNumber: foundIndex + 1 };
      }
      throw error;
    }
  }

  private assertCanStartNewAttempt(
    exam: ExamSchedule,
    sessions: readonly ExamSession[],
    now: Date,
  ): void {
    const status = resolveExamStatus(exam, now);
    if (status === ExamStatus.UPCOMING) {
      throw new BadRequestException('This exam is not open yet');
    }
    if (status === ExamStatus.CLOSED) {
      throw new BadRequestException('This exam is already closed');
    }
    const maxAttempts = resolveExamMaxAttempts(exam);
    const completedCount = sessions.filter(
      (item) => item.status === ExamSessionStatus.COMPLETED,
    ).length;
    if (maxAttempts !== null && completedCount >= maxAttempts) {
      throw new ConflictException(
        'You have used all allowed attempts for this exam',
      );
    }
  }

  private validateAnswerWrites(
    inputs: readonly ExamAnswerInputDto[],
    content: ExamContent,
  ): SessionAnswerWrite[] {
    const questionIds = new Set(content.questions.map((question) => question.id));
    const byQuestion = new Map<string, string | null>();
    for (const item of inputs) {
      if (!questionIds.has(item.questionId)) {
        throw new BadRequestException(
          `Question ${item.questionId} does not belong to this exam`,
        );
      }
      const optionId = item.optionId ?? null;
      if (optionId !== null) {
        const options = content.optionsByQuestionId.get(item.questionId) ?? [];
        if (!options.some((option) => option.id === optionId)) {
          throw new BadRequestException(
            `Option ${optionId} does not belong to question ${item.questionId}`,
          );
        }
      }
      byQuestion.set(item.questionId, optionId);
    }
    return Array.from(byQuestion.entries()).map(([questionId, optionId]) => ({
      questionId,
      optionId,
    }));
  }

  private async buildAttemptView(
    exam: ExamSchedule,
    session: ExamSession,
    attemptNumber: number,
    now: Date,
  ): Promise<ExamAttemptView> {
    if (exam.format === ExamFormat.FILE) {
      const questionFile = exam.fileQuestionId
        ? await this.fileFacade.getDownloadLink(exam.fileQuestionId)
        : null;
      const fileIds = await this.sessionRepository.findFileIds(session.id);
      const submittedFiles =
        fileIds.length > 0
          ? await this.fileFacade.getDownloadLinks(fileIds)
          : [];
      return {
        session: {
          id: session.id,
          examScheduleId: session.examScheduleId,
          attemptNumber,
          status: session.status,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          submittedAt: session.submittedAt ?? null,
        },
        exam: {
          id: exam.id,
          classId: exam.classId,
          examName: exam.examName,
          format: exam.format,
          startTime: exam.startTime,
          endTime: exam.endTime,
          durationMinutes: exam.durationMinutes,
          maxAttempts: 1,
          showResults: exam.showResults ?? true,
        },
        deadline: computeSessionDeadline(exam, session.startedAt),
        serverNow: now,
        questions: [],
        savedAnswers: {},
        questionFile,
        submittedFiles,
      };
    }

    const content = await this.examRepository.findContent(exam.id);
    const savedMap = await this.sessionRepository.findAnswers(session.id);
    const questions = this.buildStudentQuestions(exam, session.id, content);
    return {
      session: {
        id: session.id,
        examScheduleId: session.examScheduleId,
        attemptNumber,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        submittedAt: session.submittedAt ?? null,
      },
      exam: {
        id: exam.id,
        classId: exam.classId,
        examName: exam.examName,
        format: exam.format,
        startTime: exam.startTime,
        endTime: exam.endTime,
        durationMinutes: exam.durationMinutes,
        maxAttempts: exam.maxAttempts === undefined ? 1 : exam.maxAttempts,
        showResults: exam.showResults ?? true,
      },
      deadline: computeSessionDeadline(exam, session.startedAt),
      serverNow: now,
      questions,
      savedAnswers: Object.fromEntries(savedMap),
    };
  }

  private buildStudentQuestions(
    exam: ExamSchedule,
    sessionId: string,
    content: ExamContent,
  ): StudentExamQuestionView[] {
    const orderedQuestions = exam.shuffleQuestions
      ? shuffleWithSeed(content.questions, sessionId)
      : content.questions;
    return orderedQuestions.map((question, index) => {
      const rawOptions = content.optionsByQuestionId.get(question.id) ?? [];
      const orderedOptions = exam.shuffleOptions
        ? shuffleWithSeed(rawOptions, `${sessionId}:${question.id}`)
        : rawOptions;
      return {
        id: question.id,
        content: question.content,
        orderIndex: index,
        options: orderedOptions.map((option) => ({
          id: option.id,
          content: option.content,
        })),
      };
    });
  }

  private toSummaryView(
    exam: ExamSchedule,
    sessions: readonly ExamSession[],
    now: Date,
  ): StudentExamSummaryView {
    const status = resolveExamStatus(exam, now);
    const showResults = exam.showResults ?? true;
    const completed = sessions.filter(
      (item) => item.status === ExamSessionStatus.COMPLETED,
    );
    const active = sessions.find(
      (item) => item.status === ExamSessionStatus.IN_PROGRESS,
    );
    return {
      id: exam.id,
      classId: exam.classId,
      examName: exam.examName,
      startTime: exam.startTime,
      endTime: exam.endTime,
      durationMinutes: exam.durationMinutes,
      format: exam.format,
      status,
      maxAttempts: resolveExamMaxAttempts(exam),
      showResults,
      attemptsUsed: completed.length,
      inProgressSessionId: active?.id ?? null,
      bestScore: showResults ? this.computeBestScore(completed) : null,
    };
  }

  private buildLobbyView(
    exam: ExamSchedule,
    sessions: readonly ExamSession[],
    questionCount: number,
    now: Date,
  ): StudentExamLobbyView {
    const status = resolveExamStatus(exam, now);
    const showResults = exam.showResults ?? true;
    const maxAttempts = resolveExamMaxAttempts(exam);
    const completed = sessions.filter(
      (item) => item.status === ExamSessionStatus.COMPLETED,
    );
    const active = sessions.find(
      (item) => item.status === ExamSessionStatus.IN_PROGRESS,
    );
    const canStartNewAttempt =
      status === ExamStatus.OPEN &&
      !active &&
      (maxAttempts === null || completed.length < maxAttempts);
    const attempts: StudentExamAttemptItemView[] = sessions.map(
      (session, index) => ({
        id: session.id,
        attemptNumber: index + 1,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        submittedAt: session.submittedAt ?? null,
        gradedAt: session.gradedAt ?? null,
        comment: showResults ? (session.comment ?? null) : null,
        score:
          showResults &&
          (session.status === ExamSessionStatus.COMPLETED ||
            session.gradedAt !== null)
            ? toNumberOrNull(session.score)
            : null,
      }),
    );
    return {
      id: exam.id,
      classId: exam.classId,
      examName: exam.examName,
      startTime: exam.startTime,
      endTime: exam.endTime,
      durationMinutes: exam.durationMinutes,
      format: exam.format,
      status,
      questionCount,
      maxAttempts,
      showResults,
      shuffleQuestions: exam.shuffleQuestions ?? false,
      shuffleOptions: exam.shuffleOptions ?? false,
      attemptsUsed: completed.length,
      bestScore: showResults ? this.computeBestScore(completed) : null,
      canStartNewAttempt,
      activeSessionId: active?.id ?? null,
      attempts,
      serverNow: now,
    };
  }

  private computeBestScore(completed: readonly ExamSession[]): number | null {
    const scores = completed
      .map((item) => toNumberOrNull(item.score))
      .filter((score): score is number => score !== null);
    return scores.length === 0 ? null : Math.max(...scores);
  }

  private async buildSubmitResult(
    exam: ExamSchedule,
    session: ExamSession,
    attemptNumber: number,
    content: ExamContent,
  ): Promise<SubmitExamResultView> {
    const showResults = exam.showResults ?? true;
    const answers = await this.sessionRepository.findAnswers(session.id);
    const grade = this.computeGrade(content, answers);
    return {
      sessionId: session.id,
      examId: exam.id,
      classId: exam.classId,
      attemptNumber,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt ?? new Date(),
      showResults,
      score: showResults ? (toNumberOrNull(session.score) ?? grade.score) : null,
      correctCount: showResults ? grade.correctCount : null,
      totalQuestions: grade.totalQuestions,
    };
  }

  private async buildReviewView(
    exam: ExamSchedule,
    session: ExamSession,
    attemptNumber: number,
  ): Promise<ExamAttemptReviewView> {
    if (exam.format === ExamFormat.FILE) {
      const questionFile = exam.fileQuestionId
        ? await this.fileFacade.getDownloadLink(exam.fileQuestionId)
        : null;
      const fileIds = await this.sessionRepository.findFileIds(session.id);
      const submittedFiles =
        fileIds.length > 0
          ? await this.fileFacade.getDownloadLinks(fileIds)
          : [];
      return {
        sessionId: session.id,
        examId: exam.id,
        classId: exam.classId,
        examName: exam.examName,
        format: exam.format,
        attemptNumber,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        submittedAt: session.submittedAt ?? null,
        gradedAt: session.gradedAt ?? null,
        comment: session.comment ?? null,
        score: toNumberOrNull(session.score),
        correctCount: 0,
        totalQuestions: 0,
        questions: [],
        questionFile,
        submittedFiles,
      };
    }

    const content = await this.examRepository.findContent(exam.id);
    const savedAnswers = await this.sessionRepository.findAnswers(session.id);
    const grade = this.computeGrade(content, savedAnswers);
    const orderedQuestions = exam.shuffleQuestions
      ? shuffleWithSeed(content.questions, session.id)
      : content.questions;
    const questions: ExamReviewQuestionView[] = orderedQuestions.map(
      (question) => {
        const rawOptions = content.optionsByQuestionId.get(question.id) ?? [];
        const orderedOptions = exam.shuffleOptions
          ? shuffleWithSeed(rawOptions, `${session.id}:${question.id}`)
          : rawOptions;
        return {
          id: question.id,
          content: question.content,
          selectedOptionId: savedAnswers.get(question.id) ?? null,
          options: orderedOptions.map((option) => ({
            id: option.id,
            content: option.content,
            isCorrect: option.isCorrect,
          })),
        };
      },
    );
    return {
      sessionId: session.id,
      examId: exam.id,
      classId: exam.classId,
      examName: exam.examName,
      format: exam.format,
      attemptNumber,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      score: toNumberOrNull(session.score) ?? grade.score,
      correctCount: grade.correctCount,
      totalQuestions: grade.totalQuestions,
      questions,
    };
  }
}

