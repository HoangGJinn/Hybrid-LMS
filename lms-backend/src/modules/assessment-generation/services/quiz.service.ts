import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Subject } from '../../academic/entities/subject.entity.js';
import { KnowledgeComponent } from '../../document/entities/knowledge-component.entity.js';
import type { CreateQuizDto, SubmitAnswerDto } from '../dto/quiz.dto.js';
import { QuestionKnowledgeComponent } from '../entities/question-knowledge-component.entity.js';
import { QuestionOption } from '../entities/question-option.entity.js';
import { Question } from '../entities/question.entity.js';
import { QuizInstanceAnswer } from '../entities/quiz-instance-answer.entity.js';
import { QuizInstanceQuestion } from '../entities/quiz-instance-question.entity.js';
import { QuizInstance } from '../entities/quiz-instance.entity.js';
import { QuizGenerationStrategy } from '../enums/quiz-generation-strategy.enum.js';
import { QuizInstanceStatus } from '../enums/quiz-instance-status.enum.js';
import {
  QUESTION_SELECTOR,
  type QuestionSelector,
} from '../types/question-selector.type.js';
import type {
  KcBreakdownView,
  KcMasteryView,
  PracticeInfoView,
  QuizAnswerFeedback,
  QuizResultView,
  QuizSummaryView,
  QuizView,
} from '../types/quiz-view.type.js';
import { computeMasteryByKc, type AnswerSample } from '../utils/mastery.js';
import { shuffled } from '../utils/random.js';

const HISTORY_ROWS = 2000;
const round2 = (n: number): number => Math.round(n * 100) / 100;

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(QuizInstance)
    private readonly quizzes: Repository<QuizInstance>,
    @InjectRepository(QuizInstanceQuestion)
    private readonly quizQuestions: Repository<QuizInstanceQuestion>,
    @InjectRepository(QuizInstanceAnswer)
    private readonly answers: Repository<QuizInstanceAnswer>,
    @InjectRepository(Question)
    private readonly questions: Repository<Question>,
    @InjectRepository(QuestionOption)
    private readonly options: Repository<QuestionOption>,
    @InjectRepository(QuestionKnowledgeComponent)
    private readonly links: Repository<QuestionKnowledgeComponent>,
    @InjectRepository(KnowledgeComponent)
    private readonly kcs: Repository<KnowledgeComponent>,
    @InjectRepository(Subject)
    private readonly subjects: Repository<Subject>,
    @Inject(QUESTION_SELECTOR)
    private readonly selector: QuestionSelector,
    private readonly dataSource: DataSource,
  ) {}

  /** Builds a quiz for the student from the approved, active questions of the subject. */
  async create(studentId: string, dto: CreateQuizDto): Promise<QuizView> {
    const subject = await this.subjects.findOne({ where: { id: dto.subjectId } });
    if (!subject) throw new NotFoundException('Không tìm thấy môn học.');
    await this.assertEnrolled(studentId, dto.subjectId);

    const subjectKcs = await this.kcs.find({ where: { subjectId: dto.subjectId } });
    const subjectKcIds = new Set(subjectKcs.map((k) => k.id));
    const kcIds = dto.kcIds?.length ? [...new Set(dto.kcIds)] : [...subjectKcIds];
    if (kcIds.some((id) => !subjectKcIds.has(id))) {
      throw new BadRequestException('Có chủ đề không thuộc môn học đã chọn.');
    }

    const focus = dto.focus ?? 'WEAK';
    const picked = await this.selector.select({
      studentId,
      subjectId: dto.subjectId,
      kcIds,
      count: dto.numQuestions,
      focus,
    });
    if (picked.length === 0) {
      throw new BadRequestException('Chưa có câu hỏi nào cho các chủ đề này.');
    }

    const questionIds = picked.map((p) => p.questionId);
    const options = await this.options.find({ where: { questionId: In(questionIds) } });
    const optionIdsByQuestion = new Map<string, string[]>();
    for (const o of options) {
      const list = optionIdsByQuestion.get(o.questionId) ?? [];
      list.push(o.id);
      optionIdsByQuestion.set(o.questionId, list);
    }

    const strategy = dto.kcIds?.length
      ? QuizGenerationStrategy.CUSTOM_KC
      : focus === 'WEAK'
        ? QuizGenerationStrategy.WEAK_KC
        : QuizGenerationStrategy.MIXED;

    const quizId = await this.dataSource.transaction(async (manager) => {
      const quiz = await manager.save(
        manager.create(QuizInstance, {
          studentId,
          subjectId: dto.subjectId,
          title: dto.title?.trim() || `Practice: ${subject.name}`,
          generationStrategy: strategy,
          targetDifficulty: 'MIXED',
          numQuestions: picked.length,
          status: QuizInstanceStatus.IN_PROGRESS,
          startedAt: new Date(),
        }),
      );
      await manager.save(
        QuizInstanceQuestion,
        picked.map((p, i) =>
          manager.create(QuizInstanceQuestion, {
            quizInstanceId: quiz.id,
            questionId: p.questionId,
            orderIndex: i + 1,
            // Option order is fixed now, so reloading the page never reshuffles the answers.
            optionOrder: shuffled(optionIdsByQuestion.get(p.questionId) ?? []),
          }),
        ),
      );
      return quiz.id;
    });

    return this.buildView(await this.loadOwned(quizId, studentId));
  }

  async get(quizId: string, studentId: string): Promise<QuizView> {
    return this.buildView(await this.loadOwned(quizId, studentId));
  }

  async listMine(studentId: string): Promise<QuizSummaryView[]> {
    const rows = await this.quizzes.find({
      where: { studentId },
      order: { createdAt: 'DESC' },
      take: 30,
    });
    return rows.map((q) => ({
      id: q.id,
      subjectId: q.subjectId,
      title: q.title,
      status: q.status,
      numQuestions: q.numQuestions,
      score: q.score === null ? null : Number(q.score),
      correctCount: q.correctCount,
      createdAt: q.createdAt,
      submittedAt: q.submittedAt,
    }));
  }

  /** Records one answer and returns the feedback. Answering the same question again returns the first answer. */
  async answer(
    quizId: string,
    studentId: string,
    dto: SubmitAnswerDto,
  ): Promise<QuizAnswerFeedback> {
    const quiz = await this.loadOwned(quizId, studentId);
    if (quiz.status !== QuizInstanceStatus.IN_PROGRESS) {
      throw new ConflictException('Bài quiz này đã được nộp.');
    }

    const qq = await this.quizQuestions.findOne({
      where: { id: dto.quizInstanceQuestionId, quizInstanceId: quiz.id },
    });
    if (!qq) throw new NotFoundException('Không tìm thấy câu hỏi trong bài quiz.');

    const [question, options] = await Promise.all([
      this.questions.findOneByOrFail({ id: qq.questionId }),
      this.options.find({ where: { questionId: qq.questionId } }),
    ]);
    const correct = options.find((o) => o.isCorrect);
    if (!correct) throw new ConflictException('Câu hỏi này chưa có đáp án đúng.');

    const existing = await this.answers.findOne({
      where: { quizInstanceQuestionId: qq.id, studentId },
    });
    if (existing) return this.feedback(existing, correct.id, question.explanation);

    const selected = options.find((o) => o.id === dto.selectedOptionId);
    if (!selected) throw new BadRequestException('Đáp án không thuộc câu hỏi này.');

    const kcLinks = await this.links.find({
      where: { questionId: qq.questionId },
      order: { kcId: 'ASC' },
      take: 1,
    });

    const saved = await this.answers.save(
      this.answers.create({
        quizInstanceQuestionId: qq.id,
        studentId,
        questionId: qq.questionId,
        kcId: kcLinks[0]?.kcId ?? null,
        selectedOptionId: selected.id,
        isCorrect: selected.isCorrect,
        timeSpentSeconds: dto.timeSpentSeconds ?? null,
      }),
    );
    return this.feedback(saved, correct.id, question.explanation);
  }

  /** Grades the quiz (unanswered questions count as wrong) and returns the result with per-topic progress. */
  async submit(quizId: string, studentId: string): Promise<QuizResultView> {
    const quiz = await this.loadOwned(quizId, studentId);

    if (quiz.status === QuizInstanceStatus.IN_PROGRESS) {
      const qqs = await this.quizQuestions.find({ where: { quizInstanceId: quiz.id } });
      const answers = qqs.length
        ? await this.answers.find({
            where: { studentId, quizInstanceQuestionId: In(qqs.map((q) => q.id)) },
          })
        : [];
      const correctCount = answers.filter((a) => a.isCorrect).length;
      quiz.correctCount = correctCount;
      quiz.score = round2((correctCount / Math.max(1, quiz.numQuestions)) * 100);
      quiz.status = QuizInstanceStatus.SUBMITTED;
      quiz.submittedAt = new Date();
      await this.quizzes.save(quiz);
    }
    return this.result(quiz, studentId);
  }

  async getResult(quizId: string, studentId: string): Promise<QuizResultView> {
    const quiz = await this.loadOwned(quizId, studentId);
    if (quiz.status !== QuizInstanceStatus.SUBMITTED) {
      throw new ConflictException('Bài quiz chưa được nộp.');
    }
    return this.result(quiz, studentId);
  }

  /** Mastery per knowledge component of a subject (or of the given KCs). */
  async mastery(
    studentId: string,
    subjectId: string,
    kcIds?: string[],
  ): Promise<KcMasteryView[]> {
    await this.assertEnrolled(studentId, subjectId);
    const subjectKcs = await this.kcs.find({ where: { subjectId } });
    const wanted = kcIds?.length ? new Set(kcIds) : null;
    const target = subjectKcs.filter((k) => !wanted || wanted.has(k.id));
    if (target.length === 0) return [];

    const history = await this.history(studentId, target.map((k) => k.id));
    const mastery = computeMasteryByKc(history.map((h) => h.sample));
    return target.map((k) => {
      const m = mastery.get(k.id);
      return {
        kcId: k.id,
        name: k.name,
        attempted: m?.attempted ?? 0,
        correct: m?.correct ?? 0,
        mastery: m ? m.mastery : null,
      };
    });
  }

  /**
   * Topics of a document (via its text segments) with the student's progress on each.
   * The student must be in the class and the document must be part of that class.
   */
  async practiceInfo(
    studentId: string,
    classId: string,
    documentId: string,
  ): Promise<PracticeInfoView> {
    const found: { subject_id: string; title: string }[] = await this.dataSource.query(
      `SELECT c.subject_id AS subject_id, d.title AS title
         FROM class_students cs
         JOIN classes c ON c.id = cs.class_id
         JOIN sections s ON s.class_id = c.id
         JOIN section_items i ON i.section_id = s.id
         JOIN documents d ON d.id = i.document_id
        WHERE cs.student_id = $1 AND c.id = $2 AND i.document_id = $3
        LIMIT 1`,
      [studentId, classId, documentId],
    );
    if (found.length === 0) {
      throw new NotFoundException('Không tìm thấy tài liệu trong lớp của bạn.');
    }

    const kcRows: { id: string; name: string }[] = await this.dataSource.query(
      `SELECT DISTINCT kc.id AS id, kc.name AS name
         FROM document_text_segments seg
         JOIN segment_knowledge_components skc ON skc.segment_id = seg.id
         JOIN knowledge_components kc ON kc.id = skc.kc_id
        WHERE seg.document_id = $1
        ORDER BY kc.name`,
      [documentId],
    );

    const history = kcRows.length
      ? await this.history(studentId, kcRows.map((k) => k.id))
      : [];
    const mastery = computeMasteryByKc(history.map((h) => h.sample));
    return {
      subjectId: found[0].subject_id,
      documentTitle: found[0].title,
      kcs: kcRows.map((k) => {
        const m = mastery.get(k.id);
        return {
          kcId: k.id,
          name: k.name,
          attempted: m?.attempted ?? 0,
          correct: m?.correct ?? 0,
          mastery: m ? m.mastery : null,
        };
      }),
    };
  }

  // ---------------------------------------------------------------------------------------------

  /** 404 for both "missing" and "someone else's", so ids of other students' quizzes are not confirmed. */
  private async loadOwned(quizId: string, studentId: string): Promise<QuizInstance> {
    const quiz = await this.quizzes.findOne({ where: { id: quizId, studentId } });
    if (!quiz) throw new NotFoundException('Không tìm thấy bài quiz.');
    return quiz;
  }

  /** The student must be in a class of the subject. */
  private async assertEnrolled(studentId: string, subjectId: string): Promise<void> {
    const rows: unknown[] = await this.dataSource.query(
      `SELECT 1 FROM class_students cs
         JOIN classes c ON c.id = cs.class_id
        WHERE cs.student_id = $1 AND c.subject_id = $2
        LIMIT 1`,
      [studentId, subjectId],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Bạn chưa học môn này.');
    }
  }

  private feedback(
    answer: QuizInstanceAnswer,
    correctOptionId: string,
    explanation: string | null,
  ): QuizAnswerFeedback {
    return {
      selectedOptionId: answer.selectedOptionId,
      isCorrect: answer.isCorrect,
      correctOptionId,
      explanation,
    };
  }

  private async history(
    studentId: string,
    kcIds: string[],
  ): Promise<{ sample: AnswerSample; quizInstanceQuestionId: string }[]> {
    const rows = await this.answers.find({
      select: { kcId: true, isCorrect: true, answeredAt: true, quizInstanceQuestionId: true },
      where: { studentId, kcId: In(kcIds) },
      order: { answeredAt: 'DESC' },
      take: HISTORY_ROWS,
    });
    return rows.map((r) => ({
      quizInstanceQuestionId: r.quizInstanceQuestionId,
      sample: { kcId: r.kcId, isCorrect: r.isCorrect, answeredAt: r.answeredAt },
    }));
  }

  /** The correct option and explanation are only included for answered questions, or for all once submitted. */
  private async buildView(quiz: QuizInstance): Promise<QuizView> {
    const qqs = await this.quizQuestions.find({
      where: { quizInstanceId: quiz.id },
      order: { orderIndex: 'ASC' },
    });
    const questionIds = qqs.map((q) => q.questionId);

    const [questions, options, links, answers] = qqs.length
      ? await Promise.all([
          this.questions.find({ where: { id: In(questionIds) } }),
          this.options.find({ where: { questionId: In(questionIds) } }),
          this.links.find({
            where: { questionId: In(questionIds) },
            relations: { knowledgeComponent: true },
          }),
          this.answers.find({
            where: {
              studentId: quiz.studentId,
              quizInstanceQuestionId: In(qqs.map((q) => q.id)),
            },
          }),
        ])
      : [[], [], [], []];

    const reveal = quiz.status === QuizInstanceStatus.SUBMITTED;
    const questionById = new Map(questions.map((q) => [q.id, q]));
    const answerByQq = new Map(answers.map((a) => [a.quizInstanceQuestionId, a]));

    const views = qqs.map((qq) => {
      const question = questionById.get(qq.questionId)!;
      const own = options.filter((o) => o.questionId === qq.questionId);
      const order = qq.optionOrder ?? [];
      const ordered = [...own].sort((a, b) => {
        const ia = order.indexOf(a.id);
        const ib = order.indexOf(b.id);
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
      });
      const correct = own.find((o) => o.isCorrect);
      const given = answerByQq.get(qq.id);

      let answer: QuizAnswerFeedback | null = null;
      if (correct && given) {
        answer = this.feedback(given, correct.id, question.explanation);
      } else if (correct && reveal) {
        answer = {
          selectedOptionId: null,
          isCorrect: false,
          correctOptionId: correct.id,
          explanation: question.explanation,
        };
      }

      return {
        id: qq.id,
        orderIndex: qq.orderIndex,
        questionText: question.questionText,
        difficulty: question.difficulty,
        knowledgeComponents: links
          .filter((l) => l.questionId === qq.questionId)
          .map((l) => ({ kcId: l.kcId, name: l.knowledgeComponent.name })),
        options: ordered.map((o) => ({ id: o.id, text: o.optionText })),
        answer,
      };
    });

    return {
      id: quiz.id,
      subjectId: quiz.subjectId,
      title: quiz.title,
      status: quiz.status,
      numQuestions: quiz.numQuestions,
      answeredCount: answers.length,
      score: quiz.score === null ? null : Number(quiz.score),
      correctCount: quiz.correctCount,
      createdAt: quiz.createdAt,
      submittedAt: quiz.submittedAt,
      questions: views,
    };
  }

  private async result(quiz: QuizInstance, studentId: string): Promise<QuizResultView> {
    const view = await this.buildView(quiz);

    // Each question counts towards its first knowledge component.
    const groups = new Map<string, { name: string; correct: number; total: number }>();
    for (const q of view.questions) {
      const kc = q.knowledgeComponents[0];
      if (!kc) continue;
      const g = groups.get(kc.kcId) ?? { name: kc.name, correct: 0, total: 0 };
      g.total += 1;
      if (q.answer?.isCorrect) g.correct += 1;
      groups.set(kc.kcId, g);
    }

    const history = groups.size ? await this.history(studentId, [...groups.keys()]) : [];
    const thisQuiz = new Set(view.questions.map((q) => q.id));
    const after = computeMasteryByKc(history.map((h) => h.sample));
    const before = computeMasteryByKc(
      history.filter((h) => !thisQuiz.has(h.quizInstanceQuestionId)).map((h) => h.sample),
    );

    const kcBreakdown: KcBreakdownView[] = [...groups].map(([kcId, g]) => ({
      kcId,
      name: g.name,
      correct: g.correct,
      total: g.total,
      masteryBefore: before.get(kcId)?.mastery ?? null,
      masteryAfter: after.get(kcId)?.mastery ?? null,
    }));
    return { quiz: view, kcBreakdown };
  }
}