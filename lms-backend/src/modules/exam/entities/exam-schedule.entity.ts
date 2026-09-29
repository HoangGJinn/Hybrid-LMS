import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { Class } from '../../academic/entities/class.entity.js'
import { FileAttachment } from '../../../shared/file/entities/file-attachment.entity.js'

@Entity('exam_schedules')
export class ExamSchedule {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'class_id' })
  classId: string

  @ManyToOne(() => Class)
  @JoinColumn({ name: 'class_id' })
  class: Class

  @Column({ name: 'exam_name', length: 255 })
  examName: string

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime: Date

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime: Date

  @Column({ name: 'file_question_id', type: 'uuid', nullable: true })
  fileQuestionId: string | null

  @ManyToOne(() => FileAttachment)
  @JoinColumn({ name: 'file_question_id' })
  fileQuestion: FileAttachment

  @Column({ name: 'is_seen', default: false })
  isSeen: boolean
}
