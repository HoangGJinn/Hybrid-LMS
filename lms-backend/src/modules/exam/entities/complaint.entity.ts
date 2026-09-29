import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { ExamSession } from './exam-session.entity.js'
import { Student } from '../../user/entities/student.entity.js'
import { Lecturer } from '../../user/entities/lecturer.entity.js'
import { ComplaintStatus } from '../enums/complaint-status.enum.js'

@Entity('complaints')
export class Complaint {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'exam_session_id' })
  examSessionId: string

  @ManyToOne(() => ExamSession)
  @JoinColumn({ name: 'exam_session_id' })
  examSession: ExamSession

  @Column({ name: 'student_id' })
  studentId: string

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'enum', enum: ComplaintStatus, default: ComplaintStatus.OPEN })
  status: ComplaintStatus

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy: string | null

  @ManyToOne(() => Lecturer)
  @JoinColumn({ name: 'resolved_by' })
  resolver: Lecturer

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  readonly createdAt: Date

  @Column({ name: 'student_notified', default: false })
  studentNotified: boolean
}
