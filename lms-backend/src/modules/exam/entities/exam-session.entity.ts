import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { ExamSchedule } from './exam-schedule.entity.js'
import { Student } from '../../user/entities/student.entity.js'
import { Lecturer } from '../../user/entities/lecturer.entity.js'
import { FileAttachment } from '../../../shared/file/entities/file-attachment.entity.js'
import { ExamSessionStatus } from '../enums/exam-session-status.enum.js'

@Entity('exam_sessions')
export class ExamSession {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'exam_schedule_id' })
  examScheduleId: string

  @ManyToOne(() => ExamSchedule)
  @JoinColumn({ name: 'exam_schedule_id' })
  examSchedule: ExamSchedule

  @Column({ name: 'student_id' })
  studentId: string

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student

  @Column({ type: 'enum', enum: ExamSessionStatus, default: ExamSessionStatus.IN_PROGRESS })
  status: ExamSessionStatus

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  score: number | null

  @Column({ name: 'result_approved_by', type: 'uuid', nullable: true })
  resultApprovedBy: string | null

  @ManyToOne(() => Lecturer)
  @JoinColumn({ name: 'result_approved_by' })
  approver: Lecturer

  @Column({ name: 'file_proc_video_id', type: 'uuid', nullable: true })
  fileProcVideoId: string | null

  @ManyToOne(() => FileAttachment)
  @JoinColumn({ name: 'file_proc_video_id' })
  fileProcVideo: FileAttachment

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null

  @Column({ name: 'result_notified', default: false })
  resultNotified: boolean
}
