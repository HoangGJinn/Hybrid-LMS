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
 * One answer of a question. The partial unique index lets the database itself guarantee that a question
 * has at most one correct answer; "2 to 6 options" is enforced by the service.
 */
@Index('uq_exam_question_options_question_order', ['questionId', 'orderIndex'], {
  unique: true,
})
@Index('uq_exam_question_options_one_correct', ['questionId'], {
  unique: true,
  where: '"is_correct" = true',
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
