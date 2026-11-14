import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { Class } from '../../academic/entities/class.entity.js';
import { FileAttachment } from '../../../shared/file/entities/file-attachment.entity.js';
import { ExamFormat } from '../enums/exam-format.enum.js';

/**
 * An exam of one class. `startTime`/`endTime` are the window in which students may start;
 * `durationMinutes` is how long one attempt lasts (a late starter is cut off at `endTime`).
 */
@Index('uq_exam_schedules_file_question', ['fileQuestionId'], { unique: true })
@Check('ck_exam_schedules_duration_positive', '"duration_minutes" > 0')
@Check(
  'ck_exam_schedules_max_attempts_positive',
  '"max_attempts" IS NULL OR "max_attempts" >= 1',
)
@Check(
  'ck_exam_schedules_format_matches_file',
  `("format" = 'FILE') = ("file_question_id" IS NOT NULL)`,
)
@Entity('exam_schedules')
export class ExamSchedule {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @Column({ name: 'class_id' })
  classId: string;

  @ManyToOne(() => Class)
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @Column({ name: 'exam_name', length: 255 })
  examName: string;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime: Date;

  /** How long one student has once they start, in minutes. */
  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes: number;

  /** Maximum number of attempts a student may take; null means unlimited attempts (highest score is kept). */
  @Column({ name: 'max_attempts', type: 'int', nullable: true, default: 1 })
  maxAttempts: number | null;

  /** Whether students can see their score and review correct answers after completing an attempt. */
  @Column({ name: 'show_results', type: 'boolean', default: true })
  showResults: boolean;

  /** Whether question order is deterministically shuffled per attempt. */
  @Column({ name: 'shuffle_questions', type: 'boolean', default: false })
  shuffleQuestions: boolean;

  /** Whether answer choices within each question are deterministically shuffled per attempt. */
  @Column({ name: 'shuffle_options', type: 'boolean', default: false })
  shuffleOptions: boolean;

  /** MULTIPLE_CHOICE exams own `ExamQuestion` rows; FILE exams own `fileQuestionId` instead, never both. */
  @Column({
    type: 'enum',
    enum: ExamFormat,
    default: ExamFormat.MULTIPLE_CHOICE,
  })
  format: ExamFormat;

  /** A question file belongs to exactly one exam, enforced by a unique index. */
  @Column({ name: 'file_question_id', type: 'uuid', nullable: true })
  fileQuestionId: string | null;

  @ManyToOne(() => FileAttachment)
  @JoinColumn({ name: 'file_question_id' })
  fileQuestion: FileAttachment;

  @Column({ name: 'is_seen', default: false })
  isSeen: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  readonly createdAt: Date;
}
