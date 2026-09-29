import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { Assignment } from './assignment.entity.js'
import { Student } from '../../user/entities/student.entity.js'

@Entity('assignment_submissions')
export class AssignmentSubmission {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'assignment_id' })
  assignmentId: string

  @ManyToOne(() => Assignment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignment_id' })
  assignment: Assignment

  @Column({ name: 'submitted_by' })
  submittedBy: string

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'submitted_by' })
  student: Student

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  score: number | null

  @Column({ type: 'text', nullable: true })
  comment: string | null

  @Column({ name: 'submitted_at', type: 'timestamptz' })
  submittedAt: Date

  @Column({ name: 'graded_notified', default: false })
  gradedNotified: boolean
}
