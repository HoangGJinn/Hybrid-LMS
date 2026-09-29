import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm'
import { ExamSchedule } from './exam-schedule.entity.js'
import { ExamMode } from './exam-mode.entity.js'

@Entity('exam_schedule_modes')
export class ExamScheduleMode {
  @PrimaryColumn({ name: 'exam_schedule_id', type: 'uuid' })
  examScheduleId: string

  @ManyToOne(() => ExamSchedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_schedule_id' })
  examSchedule: ExamSchedule

  @PrimaryColumn({ name: 'exam_mode_id', type: 'uuid' })
  examModeId: string

  @ManyToOne(() => ExamMode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_mode_id' })
  examMode: ExamMode
}
