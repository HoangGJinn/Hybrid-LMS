import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Student } from '../../user/entities/student.entity.js';
import { Subject } from '../../academic/entities/subject.entity.js';
import { QuizInstanceStatus } from '../enums/quiz-instance-status.enum.js';
import { QuizGenerationStrategy } from '../enums/quiz-generation-strategy.enum.js';

@Entity('quiz_instances')
export class QuizInstance {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'subject_id' })
  subjectId: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  /**
   * Phiên bản mô hình ENAS-KT dùng để chọn câu hỏi (-> kt_model_versions.id).
   * Bảng kt_model_versions chưa có entity nên tạm chưa khai báo FK.
   */
  @Column({ name: 'model_version_id', type: 'uuid', nullable: true })
  modelVersionId: string | null;

  @Column({ length: 255 })
  title: string;

  @Column({
    name: 'generation_strategy',
    type: 'enum',
    enum: QuizGenerationStrategy,
  })
  generationStrategy: QuizGenerationStrategy;

  @Column({ name: 'target_difficulty', length: 20 })
  targetDifficulty: string;

  @Column({ name: 'num_questions', type: 'int' })
  numQuestions: number;

  @Column({ name: 'random_seed', type: 'varchar', length: 100, nullable: true })
  randomSeed: string | null;

  @Column({
    type: 'enum',
    enum: QuizInstanceStatus,
    default: QuizInstanceStatus.CREATED,
  })
  status: QuizInstanceStatus;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  score: number | null;

  @Column({ name: 'correct_count', type: 'int', nullable: true })
  correctCount: number | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  readonly createdAt: Date;

  @Column({ name: 'student_notified', default: false })
  studentNotified: boolean;
}