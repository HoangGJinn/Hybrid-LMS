import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ExamSchedule } from './exam-schedule.entity.js';

/** One multiple-choice question of an exam; every question is worth the same, so there is no weight column. */
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

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number;
}
