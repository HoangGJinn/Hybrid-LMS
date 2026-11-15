import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ZipArchive } from 'archiver';
import type { Response } from 'express';
import type { Readable } from 'node:stream';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { emptyToNull } from '../../../common/utils/string.util.js';
import { FileFacade } from '../../../shared/file/facades/file.facade.js';
import type { FileDownloadView } from '../../../shared/file/types/file-download-view.type.js';
import { AcademicFacade } from '../../academic/facades/academic.facade.js';
import type { GradeExamSessionDto } from '../dto/grade-exam-session.dto.js';
import type { ExamSchedule } from '../entities/exam-schedule.entity.js';
import type { ExamSession } from '../entities/exam-session.entity.js';
import { ExamFormat } from '../enums/exam-format.enum.js';
import { ExamSessionStatus } from '../enums/exam-session-status.enum.js';
import {
  type ExamContent,
  ExamRepository,
} from '../repositories/exam.repository.js';
import { ExamSessionRepository } from '../repositories/exam-session.repository.js';
import type {
  LecturerExamAttemptItemView,
  LecturerExamQueueItemView,
  LecturerExamResultsSummaryView,
  LecturerExamResultsView,
  LecturerStudentExamResultView,
  StudentExamResultStatus,
} from '../types/exam-results-view.type.js';
import type {
  ExamAttemptReviewView,
  ExamReviewQuestionView,
} from '../types/student-exam-view.type.js';
import { gradeMultipleChoiceAttempt } from '../utils/exam-grading.util.js';
import { shuffleWithSeed } from '../utils/exam-shuffle.util.js';
import { resolveExamMaxAttempts } from '../utils/exam-status.util.js';
import { StudentExamService } from './student-exam.service.js';

const toNumberOrNull = (value: number | string | null): number | null =>
  value === null || value === undefined ? null : Number(value);

const roundTwoDecimals = (value: number): number =>
  Math.round(value * 100) / 100;

const unsafeNameChars = /[\\/:*?"<>|]+/g;
const safeName = (name: string): string =>
  name.replace(unsafeNameChars, '_').trim() || 'untitled';

/**
 * Lecturer operations for viewing class exam results, auto-finalizing expired student attempts,
 * grading FILE exam submissions (SCRUM-52), downloading submission archives, and exporting results (SCRUM-54).
 */
@Injectable()
export class ExamGradingService {
  constructor(
    private readonly examRepository: ExamRepository,
    private readonly sessionRepository: ExamSessionRepository,
    private readonly studentExamService: StudentExamService,
    private readonly academicFacade: AcademicFacade,
    private readonly fileFacade: FileFacade,
  ) {}

  /**
   * Returns the full class results table and summary statistics for an exam.
   * Before building the view, any expired `IN_PROGRESS` session across all students is
   * automatically graded (from `exam_session_answers` for `MULTIPLE_CHOICE`) and finalized as `COMPLETED`.
   */
  async getResults(
    classId: string,
    examId: string,
    user: AuthenticatedUser,
    now: Date = new Date(),
  ): Promise<LecturerExamResultsView> {
    await this.academicFacade.assertCanManageClass(classId, user);
    const exam = await this.findExamInClass(classId, examId);
    const sessions =
      await this.studentExamService.finalizeExpiredSessionsForExam(exam, now);
    const roster = await this.academicFacade.getClassRoster(classId, user);

    const sessionIds = sessions.map((s) => s.id);
    const isMcq = exam.format === ExamFormat.MULTIPLE_CHOICE;
    const content = isMcq
      ? await this.examRepository.findContent(exam.id)
      : { questions: [], optionsByQuestionId: new Map() };
    const answersBySession = isMcq
      ? await this.sessionRepository.findAnswersBySessions(sessionIds)
      : new Map<string, ReadonlyMap<string, string>>();

    const fileIdsBySession = !isMcq
      ? await this.sessionRepository.findFileIdsBySessions(sessionIds)
      : new Map<string, string[]>();
    const allFileIds = [...fileIdsBySession.values()].flat();
    const downloadLinks =
      allFileIds.length > 0
        ? await this.fileFacade.getDownloadLinks(allFileIds)
        : [];
    const linkById = new Map(downloadLinks.map((link) => [link.fileId, link]));

    const sessionsByStudent = new Map<string, ExamSession[]>();
    for (const session of sessions) {
      const list = sessionsByStudent.get(session.studentId) ?? [];
      list.push(session);
      sessionsByStudent.set(session.studentId, list);
    }

    const students: LecturerStudentExamResultView[] = roster.map((student) => {
      const studentSessions = sessionsByStudent.get(student.id) ?? [];
      return this.buildStudentResultRow(
        student,
        exam,
        studentSessions,
        content,
        answersBySession,
        fileIdsBySession,
        linkById,
      );
    });

    const summary = this.computeSummary(students);
    return {
      examId: exam.id,
      classId: exam.classId,
      examName: exam.examName,
      format: exam.format,
      maxAttempts: resolveExamMaxAttempts(exam),
      summary,
      students,
    };
  }

  /**
   * Returns all submitted or expired FILE exam attempts across the given classes
   * for the lecturer's cross-class Grading Desk queue, ordered newest submission first.
   */
  async getLecturerQueue(
    classIds: string[],
    user: AuthenticatedUser,
    now: Date = new Date(),
  ): Promise<LecturerExamQueueItemView[]> {
    const uniqueClassIds = [...new Set(classIds)];
    if (uniqueClassIds.length === 0) return [];
    await Promise.all(
      uniqueClassIds.map((classId) =>
        this.academicFacade.assertCanManageClass(classId, user),
      ),
    );
    const fileExams = await this.examRepository.findByClassIdsAndFormat(
      uniqueClassIds,
      ExamFormat.FILE,
    );
    if (fileExams.length === 0) return [];

    const sessionsPerExam = await Promise.all(
      fileExams.map((exam) =>
        this.studentExamService.finalizeExpiredSessionsForExam(exam, now),
      ),
    );
    const allSessionIds = sessionsPerExam.flat().map((s) => s.id);
    if (allSessionIds.length === 0) return [];

    const fileIdsBySession =
      await this.sessionRepository.findFileIdsBySessions(allSessionIds);
    const linkById = await this.loadQueueFileLinks(fileExams, fileIdsBySession);
    const rosterByClass = await this.loadRosterMaps(fileExams, sessionsPerExam, user);

    const items = fileExams.flatMap((exam, idx) =>
      this.buildExamQueueItems(
        exam,
        sessionsPerExam[idx] ?? [],
        fileIdsBySession,
        linkById,
        rosterByClass.get(exam.classId) ?? new Map(),
      ),
    );

    return items.sort((a, b) => {
      const timeA = (a.submittedAt ?? a.endedAt ?? a.startedAt).getTime();
      const timeB = (b.submittedAt ?? b.endedAt ?? b.startedAt).getTime();
      return timeB - timeA;
    });
  }

  private async loadQueueFileLinks(
    exams: readonly ExamSchedule[],
    fileIdsBySession: ReadonlyMap<string, string[]>,
  ): Promise<Map<string, FileDownloadView>> {
    const questionFileIds = exams
      .map((exam) => exam.fileQuestionId)
      .filter((id): id is string => Boolean(id));
    const submittedFileIds = [...fileIdsBySession.values()].flat();
    const allIds = [...new Set([...questionFileIds, ...submittedFileIds])];
    if (allIds.length === 0) return new Map();
    const links = await this.fileFacade.getDownloadLinks(allIds);
    return new Map(links.map((link) => [link.fileId, link]));
  }

  private async loadRosterMaps(
    exams: readonly ExamSchedule[],
    sessionsPerExam: readonly (readonly ExamSession[])[],
    user: AuthenticatedUser,
  ): Promise<
    Map<
      string,
      Map<
        string,
        {
          readonly id: string;
          readonly studentCode: string;
          readonly fullName: string;
          readonly email: string;
        }
      >
    >
  > {
    const activeClassIds = [
      ...new Set(
        exams
          .filter((_, idx) => (sessionsPerExam[idx] ?? []).length > 0)
          .map((exam) => exam.classId),
      ),
    ];
    const entries = await Promise.all(
      activeClassIds.map(async (classId) => {
        const roster = await this.academicFacade.getClassRoster(classId, user);
        return [classId, new Map(roster.map((stu) => [stu.id, stu]))] as const;
      }),
    );
    return new Map(entries);
  }

  private buildExamQueueItems(
    exam: ExamSchedule,
    sessions: readonly ExamSession[],
    fileIdsBySession: ReadonlyMap<string, string[]>,
    linkById: ReadonlyMap<string, FileDownloadView>,
    studentById: ReadonlyMap<
      string,
      {
        readonly id: string;
        readonly studentCode: string;
        readonly fullName: string;
        readonly email: string;
      }
    >,
  ): LecturerExamQueueItemView[] {
    const attemptCountByStudent = new Map<string, number>();
    const questionFile = exam.fileQuestionId
      ? (linkById.get(exam.fileQuestionId) ?? null)
      : null;

    const queueItems: LecturerExamQueueItemView[] = [];
    for (const session of sessions) {
      const attemptNumber = (attemptCountByStudent.get(session.studentId) ?? 0) + 1;
      attemptCountByStudent.set(session.studentId, attemptNumber);

      const fileIds = fileIdsBySession.get(session.id) ?? [];
      const submittedFiles = fileIds
        .map((id) => linkById.get(id))
        .filter((link): link is FileDownloadView => link !== undefined);

      const isGradable =
        session.status === ExamSessionStatus.COMPLETED ||
        session.submittedAt !== null ||
        submittedFiles.length > 0 ||
        session.score !== null;
      if (!isGradable) continue;

      const student = studentById.get(session.studentId);
      queueItems.push({
        sessionId: session.id,
        examId: exam.id,
        classId: exam.classId,
        examName: exam.examName,
        attemptNumber,
        studentId: session.studentId,
        studentCode: student?.studentCode ?? '',
        studentName: student?.fullName ?? 'Unknown student',
        email: student?.email ?? '',
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        submittedAt: session.submittedAt ?? session.endedAt ?? null,
        gradedAt: session.gradedAt ?? null,
        score: toNumberOrNull(session.score),
        comment: session.comment ?? null,
        questionFile,
        submittedFiles,
      });
    }
    return queueItems;
  }

  /**
   * Grades or re-grades a student's exam attempt (`0..10` + optional feedback comment)
   * and finalizes the session as `COMPLETED`.
   */
  async gradeSession(
    classId: string,
    examId: string,
    sessionId: string,
    dto: GradeExamSessionDto,
    user: AuthenticatedUser,
    now: Date = new Date(),
  ): Promise<LecturerExamAttemptItemView> {
    await this.academicFacade.assertCanManageClass(classId, user);
    const exam = await this.findExamInClass(classId, examId);
    const session = await this.sessionRepository.findById(sessionId);
    if (!session || session.examScheduleId !== exam.id) {
      throw new NotFoundException('Exam session not found');
    }
    const updated = await this.sessionRepository.saveGrade(sessionId, {
      score: dto.score,
      comment: emptyToNull(dto.comment),
      gradedAt: now,
      approvedBy: user.id,
      endedAt: session.endedAt ?? now,
    });
    const allForStudent = await this.sessionRepository.findByStudentAndExam(
      exam.id,
      session.studentId,
    );
    const attemptNumber = Math.max(
      1,
      allForStudent.findIndex((item) => item.id === session.id) + 1,
    );
    const fileIds =
      exam.format === ExamFormat.FILE
        ? await this.sessionRepository.findFileIds(sessionId)
        : [];
    const submittedFiles =
      fileIds.length > 0 ? await this.fileFacade.getDownloadLinks(fileIds) : [];
    return {
      sessionId: updated.id,
      attemptNumber,
      status: updated.status,
      startedAt: updated.startedAt,
      endedAt: updated.endedAt,
      submittedAt: updated.submittedAt ?? null,
      gradedAt: updated.gradedAt ?? now,
      score: toNumberOrNull(updated.score) ?? dto.score,
      comment: updated.comment ?? null,
      correctCount: null,
      totalQuestions: 0,
      submittedFiles,
    };
  }

  /**
   * Lecturer review of any student's attempt (questions + selected answers + correct answers,
   * or FILE submission details), available regardless of `exam.showResults`.
   */
  async reviewSession(
    classId: string,
    examId: string,
    sessionId: string,
    user: AuthenticatedUser,
    now: Date = new Date(),
  ): Promise<ExamAttemptReviewView> {
    await this.academicFacade.assertCanManageClass(classId, user);
    const exam = await this.findExamInClass(classId, examId);
    const allSessions =
      await this.studentExamService.finalizeExpiredSessionsForExam(exam, now);
    const session =
      allSessions.find((item) => item.id === sessionId) ??
      (await this.sessionRepository.findById(sessionId));
    if (!session || session.examScheduleId !== exam.id) {
      throw new NotFoundException('Exam session not found');
    }
    const studentSessions = allSessions.filter(
      (item) => item.studentId === session.studentId,
    );
    const attemptNumber = Math.max(
      1,
      studentSessions.findIndex((item) => item.id === session.id) + 1,
    );

    if (exam.format === ExamFormat.FILE) {
      return this.buildFileAttemptReview(exam, session, attemptNumber);
    }
    return this.buildMcqAttemptReview(exam, session, attemptNumber);
  }

  private async buildFileAttemptReview(
    exam: ExamSchedule,
    session: ExamSession,
    attemptNumber: number,
  ): Promise<ExamAttemptReviewView> {
    const questionFile = exam.fileQuestionId
      ? await this.fileFacade.getDownloadLink(exam.fileQuestionId)
      : null;
    const fileIds = await this.sessionRepository.findFileIds(session.id);
    const submittedFiles =
      fileIds.length > 0 ? await this.fileFacade.getDownloadLinks(fileIds) : [];
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

  private async buildMcqAttemptReview(
    exam: ExamSchedule,
    session: ExamSession,
    attemptNumber: number,
  ): Promise<ExamAttemptReviewView> {
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
      submittedAt: session.submittedAt ?? null,
      gradedAt: session.gradedAt ?? null,
      comment: session.comment ?? null,
      score: toNumberOrNull(session.score) ?? grade.score,
      correctCount: grade.correctCount,
      totalQuestions: grade.totalQuestions,
      questions,
    };
  }

  /**
   * Streams a `.zip` archive of all student file submissions for a FILE exam (or one session when `sessionId` is given).
   * Organized as `{studentCode}_{fullName}/{fileName}`.
   */
  async streamSubmissionsZip(
    classId: string,
    examId: string,
    sessionId: string | undefined,
    user: AuthenticatedUser,
    response: Response,
    now: Date = new Date(),
  ): Promise<void> {
    await this.academicFacade.assertCanManageClass(classId, user);
    const exam = await this.findExamInClass(classId, examId);
    if (exam.format !== ExamFormat.FILE) {
      throw new BadRequestException(
        'Only file-based exams have downloadable submission archives',
      );
    }
    const allSessions =
      await this.studentExamService.finalizeExpiredSessionsForExam(exam, now);
    const targetSessions = sessionId
      ? allSessions.filter((s) => s.id === sessionId)
      : allSessions;
    const fileIdsBySession =
      await this.sessionRepository.findFileIdsBySessions(
        targetSessions.map((s) => s.id),
      );
    const sessionsWithFiles = targetSessions.filter(
      (s) => (fileIdsBySession.get(s.id) ?? []).length > 0,
    );
    if (sessionsWithFiles.length === 0) {
      throw new NotFoundException('No submitted files to download');
    }

    const roster = await this.academicFacade.getClassRoster(classId, user);
    const studentById = new Map(roster.map((stu) => [stu.id, stu]));

    const zipName = `${safeName(exam.examName)}-submissions.zip`;
    response.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(zipName)}`,
    });
    const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.on('error', (error) => response.destroy(error));
    archive.pipe(response);

    const addEntry = (source: Readable, name: string) =>
      new Promise<void>((resolve, reject) => {
        archive.once('entry', () => resolve());
        source.once('error', reject);
        archive.append(source, { name });
      });

    for (const session of sessionsWithFiles) {
      const student = studentById.get(session.studentId);
      const folder = student
        ? safeName(`${student.studentCode}_${student.fullName}`)
        : safeName(session.studentId);
      for (const fileId of fileIdsBySession.get(session.id) ?? []) {
        const { fileName, stream } =
          await this.fileFacade.openReadStream(fileId);
        await addEntry(stream, `${folder}/${safeName(fileName)}`);
      }
    }
    await archive.finalize();
  }

  private async findExamInClass(
    classId: string,
    examId: string,
  ): Promise<ExamSchedule> {
    const exam = await this.examRepository.findById(examId);
    if (!exam || exam.classId !== classId) {
      throw new NotFoundException('Exam not found');
    }
    return exam;
  }

  private buildStudentResultRow(
    student: {
      readonly id: string;
      readonly studentCode: string;
      readonly fullName: string;
      readonly email: string;
    },
    exam: ExamSchedule,
    sessions: readonly ExamSession[],
    content: ExamContent,
    answersBySession: ReadonlyMap<string, ReadonlyMap<string, string>>,
    fileIdsBySession: ReadonlyMap<string, string[]>,
    linkById: ReadonlyMap<string, FileDownloadView>,
  ): LecturerStudentExamResultView {
    const isMcq = exam.format === ExamFormat.MULTIPLE_CHOICE;
    const attempts: LecturerExamAttemptItemView[] = sessions.map(
      (session, index) => {
        const grade = isMcq
          ? this.computeGrade(
              content,
              answersBySession.get(session.id) ?? new Map(),
            )
          : null;
        const fileIds = fileIdsBySession.get(session.id) ?? [];
        const submittedFiles = fileIds
          .map((id) => linkById.get(id))
          .filter((link): link is FileDownloadView => link !== undefined);
        const score =
          toNumberOrNull(session.score) ??
          (isMcq && session.status === ExamSessionStatus.COMPLETED
            ? (grade?.score ?? null)
            : null);
        return {
          sessionId: session.id,
          attemptNumber: index + 1,
          status: session.status,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          submittedAt: session.submittedAt ?? session.endedAt ?? null,
          gradedAt: session.gradedAt ?? null,
          score,
          comment: session.comment ?? null,
          correctCount: grade ? grade.correctCount : null,
          totalQuestions: isMcq ? content.questions.length : 0,
          submittedFiles,
        };
      },
    );

    const completedAttempts = attempts.filter(
      (a) => a.status === ExamSessionStatus.COMPLETED,
    );
    const scoredValues = attempts
      .map((a) => a.score)
      .filter((score): score is number => score !== null);
    const bestScore =
      scoredValues.length > 0 ? Math.max(...scoredValues) : null;
    const latestAttempt =
      attempts.length > 0 ? attempts[attempts.length - 1] : null;
    const status = this.resolveStudentResultStatus(exam, attempts, bestScore);

    return {
      studentId: student.id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      email: student.email,
      status,
      attemptsUsed:
        exam.format === ExamFormat.FILE
          ? attempts.filter(
              (a) =>
                a.status === ExamSessionStatus.COMPLETED ||
                a.submittedAt !== null,
            ).length
          : completedAttempts.length,
      bestScore,
      latestSessionId: latestAttempt?.sessionId ?? null,
      latestSubmittedAt:
        latestAttempt?.submittedAt ?? latestAttempt?.endedAt ?? null,
      gradedAt: latestAttempt?.gradedAt ?? null,
      comment: latestAttempt?.comment ?? null,
      attempts,
    };
  }

  private resolveStudentResultStatus(
    exam: ExamSchedule,
    attempts: readonly LecturerExamAttemptItemView[],
    bestScore: number | null,
  ): StudentExamResultStatus {
    if (attempts.length === 0) return 'NOT_STARTED';
    if (bestScore !== null) return 'GRADED';
    if (exam.format === ExamFormat.FILE) {
      const hasSubmitted = attempts.some(
        (a) =>
          a.submittedFiles.length > 0 ||
          a.submittedAt !== null ||
          a.status === ExamSessionStatus.COMPLETED,
      );
      if (hasSubmitted) return 'SUBMITTED';
    }
    return 'IN_PROGRESS';
  }

  private computeSummary(
    students: readonly LecturerStudentExamResultView[],
  ): LecturerExamResultsSummaryView {
    const totalStudents = students.length;
    const startedCount = students.filter(
      (s) => s.status !== 'NOT_STARTED',
    ).length;
    const submittedCount = students.filter(
      (s) => s.status === 'SUBMITTED' || s.status === 'GRADED',
    ).length;
    const scores = students
      .map((s) => s.bestScore)
      .filter((score): score is number => score !== null);
    const gradedCount = scores.length;
    const averageScore =
      gradedCount > 0
        ? roundTwoDecimals(
            scores.reduce((sum, val) => sum + val, 0) / gradedCount,
          )
        : null;
    const maxScore = gradedCount > 0 ? Math.max(...scores) : null;
    const minScore = gradedCount > 0 ? Math.min(...scores) : null;

    return {
      totalStudents,
      startedCount,
      submittedCount,
      gradedCount,
      averageScore,
      maxScore,
      minScore,
    };
  }

  private computeGrade(
    content: ExamContent,
    answers: ReadonlyMap<string, string>,
  ) {
    const gradable = content.questions.map((question) => {
      const options = content.optionsByQuestionId.get(question.id) ?? [];
      const correct = options.find((option) => option.isCorrect);
      return { id: question.id, correctOptionId: correct?.id ?? null };
    });
    return gradeMultipleChoiceAttempt(gradable, answers);
  }
}

