import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ExamSchedule } from './exam-schedule.entity.js';
import { ExamQuestionType } from '../enums/exam-question-type.enum.js';

/** One interactive question of an exam (MCQ with 1+ correct answers, or Cloze Fill-in-the-Blank). */
@Index('uq_exam_questions_exam_order', ['examId', 'orderIndex'], {
  unique: true,
})
@Entity('exam_questions')
export class ExamQuestion {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @Column({ name: 'exam_id' })
  examId: string;

  @ManyToOne(() => ExamSchedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_id' })
  exam: ExamSchedule;

  @Column({
    type: 'enum',
    enum: ExamQuestionType,
    default: ExamQuestionType.MULTIPLE_CHOICE,
  })
  type: ExamQuestionType;

  @Column({ type: 'text' })
  content: string;

  /** Required correct option count (MCQ) or number of blanks (FILL_IN_THE_BLANK). */
  @Column({ name: 'correct_count', type: 'int', default: 1 })
  correctCount: number;

  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number;
}
