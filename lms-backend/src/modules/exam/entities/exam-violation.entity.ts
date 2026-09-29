import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { ExamSession } from './exam-session.entity.js'
import { ProctoringLog } from './proctoring-log.entity.js'
import { Lecturer } from '../../user/entities/lecturer.entity.js'
import { ExamViolationStatus } from '../enums/exam-violation-status.enum.js'

@Entity('exam_violations')
export class ExamViolation {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'exam_session_id' })
  examSessionId: string

  @ManyToOne(() => ExamSession)
  @JoinColumn({ name: 'exam_session_id' })
  examSession: ExamSession

  @Column({ name: 'proctoring_log_id' })
  proctoringLogId: string

  @ManyToOne(() => ProctoringLog)
  @JoinColumn({ name: 'proctoring_log_id' })
  proctoringLog: ProctoringLog

  @Column({ name: 'violation_type', length: 50 })
  violationType: string

  @Column({ length: 20 })
  severity: string

  @Column({ type: 'enum', enum: ExamViolationStatus, default: ExamViolationStatus.PENDING })
  status: ExamViolationStatus

  @Column({ name: 'review_by', type: 'uuid', nullable: true })
  reviewBy: string | null

  @ManyToOne(() => Lecturer)
  @JoinColumn({ name: 'review_by' })
  reviewer: Lecturer

  @Column({ name: 'final_decision', type: 'text', nullable: true })
  finalDecision: string | null

  @Column({ name: 'lecturer_notified', default: false })
  lecturerNotified: boolean
}
