import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { ExamSession } from './exam-session.entity.js'

@Entity('proctoring_logs')
export class ProctoringLog {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'exam_session_id' })
  examSessionId: string

  @ManyToOne(() => ExamSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_session_id' })
  examSession: ExamSession

  @Column({ name: 'snapshot_url', length: 1000 })
  snapshotUrl: string

  @Column({ name: 'event_type', length: 50 })
  eventType: string

  @Column({ name: 'confidence_score', type: 'numeric', precision: 4, scale: 3 })
  confidenceScore: number

  @Column({ name: 'detected_at', type: 'timestamptz' })
  detectedAt: Date
}
