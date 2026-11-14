import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { EntityManager, In, Repository } from 'typeorm';
import { ExamQuestionOption } from '../entities/exam-question-option.entity.js';
import { ExamQuestion } from '../entities/exam-question.entity.js';
import { ExamSchedule } from '../entities/exam-schedule.entity.js';
import { ExamSession } from '../entities/exam-session.entity.js';
import type { ExamFormat } from '../enums/exam-format.enum.js';

export interface NewExamOption {
  readonly content: string;
  readonly isCorrect: boolean;
}

export interface NewExamQuestion {
  readonly content: string;
  readonly options: readonly NewExamOption[];
}

export interface NewExam {
  readonly classId: string;
  readonly examName: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly durationMinutes: number;
  readonly format: ExamFormat;
  readonly fileQuestionId: string | null;
  readonly maxAttempts: number | null;
  readonly showResults: boolean;
  readonly shuffleQuestions: boolean;
  readonly shuffleOptions: boolean;
  readonly questions: readonly NewExamQuestion[];
}

/** An exam's questions and, for each question id, its options; both in display order. */
export interface ExamContent {
  readonly questions: ExamQuestion[];
  readonly optionsByQuestionId: ReadonlyMap<string, ExamQuestionOption[]>;
}

/** What an update writes. `content` is present only when questions, format or file are replaced. */
export interface ExamUpdate {
  readonly examName: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly durationMinutes: number;
  readonly maxAttempts: number | null;
  readonly showResults: boolean;
  readonly content?: {
    readonly format: ExamFormat;
    readonly fileQuestionId: string | null;
    readonly shuffleQuestions: boolean;
    readonly shuffleOptions: boolean;
    readonly questions: readonly NewExamQuestion[];
  };
}

export interface ExamUpdateResult {
  readonly exam: ExamSchedule;
  /** The question file the exam had before the update, so the caller can delete it once it is replaced. */
  readonly previousFileId: string | null;
}

/** All TypeORM access for exams, their questions and options. */
@Injectable()
export class ExamRepository {
  constructor(
    @InjectRepository(ExamSchedule)
    private readonly examOrmRepository: Repository<ExamSchedule>,
    @InjectRepository(ExamQuestion)
    private readonly questionOrmRepository: Repository<ExamQuestion>,
    @InjectRepository(ExamQuestionOption)
    private readonly optionOrmRepository: Repository<ExamQuestionOption>,
    @InjectRepository(ExamSession)
    private readonly sessionOrmRepository: Repository<ExamSession>,
  ) {}

  /** Creates the exam with all its questions and options in one transaction: all of it or nothing. */
  async create(input: NewExam): Promise<ExamSchedule> {
    return this.examOrmRepository.manager.transaction(async (manager) => {
      const exam = await manager.save(
        manager.create(ExamSchedule, {
          classId: input.classId,
          examName: input.examName,
          startTime: input.startTime,
          endTime: input.endTime,
          durationMinutes: input.durationMinutes,
          format: input.format,
          fileQuestionId: input.fileQuestionId,
          maxAttempts: input.maxAttempts,
          showResults: input.showResults,
          shuffleQuestions: input.shuffleQuestions,
          shuffleOptions: input.shuffleOptions,
        }),
      );
      await this.insertQuestions(manager, exam.id, input.questions);
      return exam;
    });
  }

  /**
   * Locks the exam's row, counts its sessions and lets `build` decide the change, all in one transaction.
   * A student starting at the same moment waits for the lock (or is counted), so the decision never rests
   * on a count that is already out of date. If `build` throws nothing is written. Null when the exam is gone.
   */
  async update(
    examId: string,
    build: (current: ExamSchedule, startedCount: number) => ExamUpdate,
  ): Promise<ExamUpdateResult | null> {
    return this.examOrmRepository.manager.transaction(async (manager) => {
      const current = await manager.findOne(ExamSchedule, {
        where: { id: examId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current) return null;
      const startedCount = await manager.count(ExamSession, {
        where: { examScheduleId: examId },
      });
      const change = build(current, startedCount);
      await manager.update(
        ExamSchedule,
        { id: examId },
        {
          examName: change.examName,
          startTime: change.startTime,
          endTime: change.endTime,
          durationMinutes: change.durationMinutes,
          maxAttempts: change.maxAttempts,
          showResults: change.showResults,
          ...(change.content && {
            format: change.content.format,
            fileQuestionId: change.content.fileQuestionId,
            shuffleQuestions: change.content.shuffleQuestions,
            shuffleOptions: change.content.shuffleOptions,
          }),
        },
      );
      if (change.content) {
        // The options go with their questions through the database cascade.
        await manager.delete(ExamQuestion, { examId });
        await this.insertQuestions(manager, examId, change.content.questions);
      }
      const exam = await manager.findOneByOrFail(ExamSchedule, { id: examId });
      return { exam, previousFileId: current.fileQuestionId };
    });
  }

  private async insertQuestions(
    manager: EntityManager,
    examId: string,
    questions: readonly NewExamQuestion[],
  ): Promise<void> {
    if (questions.length === 0) return;
    const questionRows = questions.map((question, index) => ({
      id: randomUUID(),
      examId,
      content: question.content,
      orderIndex: index,
    }));
    await manager.insert(ExamQuestion, questionRows);
    const optionRows = questions.flatMap((question, index) =>
      question.options.map((option, optionIndex) => ({
        questionId: questionRows[index].id,
        content: option.content,
        isCorrect: option.isCorrect,
        orderIndex: optionIndex,
      })),
    );
    await manager.insert(ExamQuestionOption, optionRows);
  }

  async findById(id: string): Promise<ExamSchedule | null> {
    return this.examOrmRepository.findOne({ where: { id } });
  }

  async findByIds(ids: string[]): Promise<ExamSchedule[]> {
    if (ids.length === 0) return [];
    return this.examOrmRepository.find({ where: { id: In(ids) } });
  }

  /** All exams of the given classes matching a specific format, newest first. */
  async findByClassIdsAndFormat(
    classIds: string[],
    format: ExamFormat,
  ): Promise<ExamSchedule[]> {
    if (classIds.length === 0) return [];
    return this.examOrmRepository.find({
      where: { classId: In(classIds), format },
      order: { startTime: 'DESC' },
    });
  }

  async countQuestions(examId: string): Promise<number> {
    return this.questionOrmRepository.count({ where: { examId } });
  }

  /** The exam's questions and options in display order. */
  async findContent(examId: string): Promise<ExamContent> {
    const questions = await this.questionOrmRepository.find({
      where: { examId },
      order: { orderIndex: 'ASC' },
    });
    const options =
      questions.length === 0
        ? []
        : await this.optionOrmRepository.find({
            where: { questionId: In(questions.map((question) => question.id)) },
            order: { orderIndex: 'ASC' },
          });
    const optionsByQuestionId = new Map<string, ExamQuestionOption[]>();
    for (const option of options) {
      const list = optionsByQuestionId.get(option.questionId) ?? [];
      list.push(option);
      optionsByQuestionId.set(option.questionId, list);
    }
    return { questions, optionsByQuestionId };
  }

  /** Tells whether any student has started the exam, i.e. whether there is work that must not be lost. */
  async hasSessions(examId: string): Promise<boolean> {
    return this.sessionOrmRepository.exists({
      where: { examScheduleId: examId },
    });
  }

  /** How many students have started the exam. */
  async countSessions(examId: string): Promise<number> {
    return this.sessionOrmRepository.count({
      where: { examScheduleId: examId },
    });
  }

  /** Deletes the exam; its questions and options go with it through the database cascade. */
  async deleteById(id: string): Promise<void> {
    await this.examOrmRepository.delete({ id });
  }
}
