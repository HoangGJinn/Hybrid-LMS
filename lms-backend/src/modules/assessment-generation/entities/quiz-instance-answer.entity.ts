import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { QuizInstanceQuestion } from './quiz-instance-question.entity.js';
import { QuestionOption } from './question-option.entity.js';
import { Question } from './question.entity.js';
import { Student } from '../../user/entities/student.entity.js';
import { KnowledgeComponent } from '../../document/entities/knowledge-component.entity.js';

@Entity('quiz_instance_answers')
@Index('idx_quiz_instance_answers_student_time', ['studentId', 'answeredAt'])
export class QuizInstanceAnswer {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  /** Câu trong đề cụ thể (quiz_instance_questions). */
  @Column({ name: 'quiz_instance_question_id' })
  quizInstanceQuestionId: string;

  @ManyToOne(() => QuizInstanceQuestion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_instance_question_id' })
  quizInstanceQuestion: QuizInstanceQuestion;

  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  /** Câu hỏi gốc trong ngân hàng (lưu sẵn để dựng chuỗi lịch sử không cần join). */
  @Column({ name: 'question_id' })
  questionId: string;

  @ManyToOne(() => Question)
  @JoinColumn({ name: 'question_id' })
  question: Question;

  /** KC chính của câu hỏi tại thời điểm trả lời (chụp lại, không đổi nếu câu hỏi bị gán KC khác sau này). */
  @Column({ name: 'kc_id', type: 'uuid', nullable: true })
  kcId: string | null;

  @ManyToOne(() => KnowledgeComponent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'kc_id' })
  knowledgeComponent: KnowledgeComponent | null;

  @Column({ name: 'selected_option_id', type: 'uuid', nullable: true })
  selectedOptionId: string | null;

  @ManyToOne(() => QuestionOption, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'selected_option_id' })
  selectedOption: QuestionOption | null;

  @Column({ name: 'is_correct' })
  isCorrect: boolean;

  /** Thời gian làm câu này (giây), phục vụ đặc trưng thời gian phản hồi của mô hình. */
  @Column({ name: 'time_spent_seconds', type: 'int', nullable: true })
  timeSpentSeconds: number | null;

  @CreateDateColumn({ name: 'answered_at', type: 'timestamptz' })
  readonly answeredAt: Date;
}