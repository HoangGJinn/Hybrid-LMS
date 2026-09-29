import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { SectionItem } from './section-item.entity.js'
import { Student } from '../../user/entities/student.entity.js'

@Entity('item_completions')
export class ItemCompletion {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'section_item_id' })
  sectionItemId: string

  @ManyToOne(() => SectionItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'section_item_id' })
  sectionItem: SectionItem

  @Column({ name: 'student_id' })
  studentId: string

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student

  @Column({ name: 'completed_at', type: 'timestamptz' })
  completedAt: Date
}
