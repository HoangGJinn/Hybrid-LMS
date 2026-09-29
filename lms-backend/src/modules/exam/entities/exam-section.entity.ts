import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm'
import { ExamSchedule } from './exam-schedule.entity.js'
import { Section } from '../../content/entities/section.entity.js'

@Entity('exam_sections')
export class ExamSection {
  @PrimaryColumn({ name: 'exam_schedule_id', type: 'uuid' })
  examScheduleId: string

  @ManyToOne(() => ExamSchedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_schedule_id' })
  examSchedule: ExamSchedule

  @PrimaryColumn({ name: 'section_id', type: 'uuid' })
  sectionId: string

  @ManyToOne(() => Section, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'section_id' })
  section: Section
}
