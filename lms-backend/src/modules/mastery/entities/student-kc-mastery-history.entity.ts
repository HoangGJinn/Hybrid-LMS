import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Student } from '../../user/entities/student.entity.js';
import { KnowledgeComponent } from '../../document/entities/knowledge-component.entity.js';
import { QuizInstance } from '../../assessment-generation/entities/quiz-instance.entity.js';

/**
 * Ảnh chụp mức hiểu biết của một KC trước và sau mỗi bài quiz. Là chuỗi liên tục: p_before của quiz sau
 * chính là p_after của quiz trước, nên "tăng/giảm" luôn so sánh cùng một phép tính.
 */
@Entity('student_kc_mastery_history')
@Index('uq_student_kc_mastery_history_quiz_kc', ['quizInstanceId', 'kcId'], { unique: true })
@Index('idx_student_kc_mastery_history_student_kc', ['studentId', 'kcId', 'recordedAt'])
export class StudentKcMasteryHistory {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'kc_id' })
  kcId: string;

  @ManyToOne(() => KnowledgeComponent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kc_id' })
  knowledgeComponent: KnowledgeComponent;

  @Column({ name: 'quiz_instance_id' })
  quizInstanceId: string;

  @ManyToOne(() => QuizInstance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_instance_id' })
  quizInstance: QuizInstance;

  /** null khi trước quiz này sinh viên chưa có dữ liệu nào về KC. */
  @Column({ name: 'p_before', type: 'numeric', precision: 4, scale: 3, nullable: true })
  pBefore: number | null;

  @Column({ name: 'p_after', type: 'numeric', precision: 4, scale: 3 })
  pAfter: number;

  @Column({ name: 'sample_size', type: 'int', default: 0 })
  sampleSize: number;

  @Column({ type: 'varchar', length: 10, default: 'enas' })
  source: 'enas' | 'history';

  @Column({ name: 'enas_log_seq', type: 'int', nullable: true })
  enasLogSeq: number | null;

  @CreateDateColumn({ name: 'recorded_at', type: 'timestamptz' })
  readonly recordedAt: Date;
}
