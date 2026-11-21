import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ExamQuestion } from './exam-question.entity.js';

/**
 * One option of a multiple-choice question (with one or more marked `isCorrect`),
 * or one numbered blank's acceptable answer variants (pipe-separated) for a fill-in-the-blank question.
 */
@Index('uq_exam_question_options_question_order', ['questionId', 'orderIndex'], {
  unique: true,
})
@Entity('exam_question_options')
export class ExamQuestionOption {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @Column({ name: 'question_id' })
  questionId: string;

  @ManyToOne(() => ExamQuestion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: ExamQuestion;

  @Column({ type: 'varchar', length: 500 })
  content: string;

  @Column({ name: 'is_correct', type: 'boolean', default: false })
  isCorrect: boolean;

  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number;
}
