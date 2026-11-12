import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { QuizInstance } from './quiz-instance.entity.js';
import { Question } from './question.entity.js';

@Entity('quiz_instance_questions')
@Index('uq_quiz_instance_questions_order', ['quizInstanceId', 'orderIndex'], {
  unique: true,
})
@Index('uq_quiz_instance_questions_question', ['quizInstanceId', 'questionId'], {
  unique: true,
})
export class QuizInstanceQuestion {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @Column({ name: 'quiz_instance_id' })
  quizInstanceId: string;

  @ManyToOne(() => QuizInstance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_instance_id' })
  quizInstance: QuizInstance;

  @Column({ name: 'question_id' })
  questionId: string;

  @ManyToOne(() => Question)
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number;

  /** Thứ tự hiển thị đã xáo trộn của các phương án (mảng id QuestionOption). */
  @Column({ name: 'option_order', type: 'jsonb', nullable: true })
  optionOrder: string[] | null;

  /** Xác suất trả lời đúng do ENAS-KT dự đoán tại thời điểm chọn câu hỏi. */
  @Column({
    name: 'p_correct_predicted',
    type: 'numeric',
    precision: 4,
    scale: 3,
    nullable: true,
  })
  pCorrectPredicted: number | null;
}