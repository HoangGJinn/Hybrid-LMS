import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ExamSessionAnswer } from '../entities/exam-session-answer.entity.js';
import { ExamSessionFile } from '../entities/exam-session-file.entity.js';
import { ExamSession } from '../entities/exam-session.entity.js';
import { ExamSessionStatus } from '../enums/exam-session-status.enum.js';

export interface SessionAnswerWrite {
  readonly questionId: string;
  readonly optionId: string | null;
}

/** TypeORM access for student exam attempts (`exam_sessions`), saved answers (`exam_session_answers`) and file submissions (`exam_session_files`). */
@Injectable()
export class ExamSessionRepository {
  constructor(
    @InjectRepository(ExamSession)
    private readonly sessionOrmRepository: Repository<ExamSession>,
    @InjectRepository(ExamSessionAnswer)
    private readonly answerOrmRepository: Repository<ExamSessionAnswer>,
    @InjectRepository(ExamSessionFile)
    private readonly fileLinkOrmRepository: Repository<ExamSessionFile>,
  ) {}

  async findById(id: string): Promise<ExamSession | null> {
    return this.sessionOrmRepository.findOne({ where: { id } });
  }

  /** All attempts of one student on one exam, from oldest to newest (`attemptNumber = index + 1`). */
  async findByStudentAndExam(
    examScheduleId: string,
    studentId: string,
  ): Promise<ExamSession[]> {
    return this.sessionOrmRepository.find({
      where: { examScheduleId, studentId },
      order: { startedAt: 'ASC' },
    });
  }

  /** All attempts of all students on one exam, ordered oldest to newest. */
  async findByExam(examScheduleId: string): Promise<ExamSession[]> {
    return this.sessionOrmRepository.find({
      where: { examScheduleId },
      order: { startedAt: 'ASC' },
    });
  }

  /** All attempts of one student across the given exams, ordered oldest to newest. */
  async findByStudentInExams(
    studentId: string,
    examScheduleIds: string[],
  ): Promise<ExamSession[]> {
    if (examScheduleIds.length === 0) return [];
    return this.sessionOrmRepository.find({
      where: {
        studentId,
        examScheduleId: In(examScheduleIds),
      },
      order: { startedAt: 'ASC' },
    });
  }

  /** Creates a new IN_PROGRESS attempt for the student. */
  async createSession(
    examScheduleId: string,
    studentId: string,
    startedAt: Date,
  ): Promise<ExamSession> {
    const session = this.sessionOrmRepository.create({
      examScheduleId,
      studentId,
      status: ExamSessionStatus.IN_PROGRESS,
      score: null,
      startedAt,
      endedAt: null,
      submittedAt: null,
      comment: null,
      gradedAt: null,
    });
    return this.sessionOrmRepository.save(session);
  }

  /** Returns the saved answers of a session as a map `questionId -> selectedOptionId`. */
  async findAnswers(sessionId: string): Promise<ReadonlyMap<string, string>> {
    const rows = await this.answerOrmRepository.find({
      where: { examSessionId: sessionId },
    });
    return new Map(rows.map((row) => [row.questionId, row.selectedOptionId]));
  }

  /** Returns the saved answers of many sessions at once, keyed by `sessionId`. */
  async findAnswersBySessions(
    sessionIds: string[],
  ): Promise<ReadonlyMap<string, ReadonlyMap<string, string>>> {
    if (sessionIds.length === 0) return new Map();
    const rows = await this.answerOrmRepository.find({
      where: { examSessionId: In(sessionIds) },
    });
    const bySession = new Map<string, Map<string, string>>();
    for (const row of rows) {
      let map = bySession.get(row.examSessionId);
      if (!map) {
        map = new Map();
        bySession.set(row.examSessionId, map);
      }
      map.set(row.questionId, row.selectedOptionId);
    }
    return bySession;
  }

  /**
   * Batch upserts selected options (`ON CONFLICT (exam_session_id, question_id) DO UPDATE`)
   * and deletes rows whose `optionId` is `null` (cleared selection), all in one transaction.
   */
  async saveAnswers(
    sessionId: string,
    answers: readonly SessionAnswerWrite[],
    answeredAt: Date,
  ): Promise<void> {
    if (answers.length === 0) return;
    await this.answerOrmRepository.manager.transaction(async (manager) => {
      const clearedQuestionIds = answers
        .filter((item) => item.optionId === null)
        .map((item) => item.questionId);
      if (clearedQuestionIds.length > 0) {
        await manager.delete(ExamSessionAnswer, {
          examSessionId: sessionId,
          questionId: In(clearedQuestionIds),
        });
      }
      const upserts = answers
        .filter(
          (item): item is { questionId: string; optionId: string } =>
            item.optionId !== null,
        )
        .map((item) => ({
          examSessionId: sessionId,
          questionId: item.questionId,
          selectedOptionId: item.optionId,
          answeredAt,
        }));
      if (upserts.length > 0) {
        await manager.upsert(ExamSessionAnswer, upserts, [
          'examSessionId',
          'questionId',
        ]);
      }
    });
  }

  /** Ids of the files attached to a FILE exam session. */
  async findFileIds(sessionId: string): Promise<string[]> {
    const links = await this.fileLinkOrmRepository.find({
      where: { examSessionId: sessionId },
    });
    return links.map((link) => link.fileId);
  }

  /** File ids of many sessions at once, keyed by session id. */
  async findFileIdsBySessions(
    sessionIds: string[],
  ): Promise<Map<string, string[]>> {
    if (sessionIds.length === 0) return new Map();
    const links = await this.fileLinkOrmRepository.find({
      where: { examSessionId: In(sessionIds) },
    });
    const bySession = new Map<string, string[]>();
    for (const link of links) {
      bySession.set(link.examSessionId, [
        ...(bySession.get(link.examSessionId) ?? []),
        link.fileId,
      ]);
    }
    return bySession;
  }

  /**
   * Replaces the attached submission files of a FILE exam session and updates `submittedAt`,
   * keeping `status = IN_PROGRESS` so the student can still edit until their timer expires.
   */
  async saveSessionFiles(
    sessionId: string,
    fileIds: readonly string[],
    submittedAt: Date,
  ): Promise<ExamSession> {
    return this.sessionOrmRepository.manager.transaction(async (manager) => {
      await manager.update(
        ExamSession,
        { id: sessionId },
        { submittedAt },
      );
      await manager.delete(ExamSessionFile, { examSessionId: sessionId });
      if (fileIds.length > 0) {
        await manager.insert(
          ExamSessionFile,
          fileIds.map((fileId) => ({ examSessionId: sessionId, fileId })),
        );
      }
      return manager.findOneByOrFail(ExamSession, { id: sessionId });
    });
  }

  /** Marks an IN_PROGRESS attempt as COMPLETED with its computed score (or null for ungraded FILE exams) and end timestamp. */
  async finalizeSession(
    sessionId: string,
    update: { readonly score: number | null; readonly endedAt: Date },
  ): Promise<ExamSession> {
    await this.sessionOrmRepository.update(
      { id: sessionId },
      {
        status: ExamSessionStatus.COMPLETED,
        score: update.score,
        endedAt: update.endedAt,
      },
    );
    return this.sessionOrmRepository.findOneByOrFail({ id: sessionId });
  }

  /** Stores the lecturer's grade and feedback for a FILE exam session, finalizing it as COMPLETED. */
  async saveGrade(
    sessionId: string,
    input: {
      readonly score: number;
      readonly comment: string | null;
      readonly gradedAt: Date;
      readonly approvedBy: string | null;
      readonly endedAt: Date;
    },
  ): Promise<ExamSession> {
    await this.sessionOrmRepository.update(
      { id: sessionId },
      {
        status: ExamSessionStatus.COMPLETED,
        score: input.score,
        comment: input.comment,
        gradedAt: input.gradedAt,
        resultApprovedBy: input.approvedBy,
        endedAt: input.endedAt,
        resultNotified: false,
      },
    );
    return this.sessionOrmRepository.findOneByOrFail({ id: sessionId });
  }
}

