import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Assignment } from './assignment.entity.js';
import { Student } from '../../user/entities/student.entity.js';

/** A student hands in once per assignment; editing the submission updates this row. */
@Index(
  'uq_assignment_submissions_assignment_student',
  ['assignmentId', 'submittedBy'],
  { unique: true },
)
@Entity('assignment_submissions')
export class AssignmentSubmission {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @Column({ name: 'assignment_id' })
  assignmentId: string;

  @ManyToOne(() => Assignment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignment_id' })
  assignment: Assignment;

  @Column({ name: 'submitted_by' })
  submittedBy: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'submitted_by' })
  student: Student;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  score: number | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  /** The answer typed online (TEXT assignments); null for file submissions. */
  @Column({ name: 'answer_text', type: 'text', nullable: true })
  answerText: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz' })
  submittedAt: Date;

  /** When the lecturer last graded this submission; null while it is ungraded. */
  @Column({ name: 'graded_at', type: 'timestamptz', nullable: true })
  gradedAt: Date | null;

  @Column({ name: 'graded_notified', default: false })
  gradedNotified: boolean;
}