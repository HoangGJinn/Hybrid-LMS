import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { Class } from '../../academic/entities/class.entity.js'

@Entity('sections')
export class Section {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'class_id' })
  classId: string

  @ManyToOne(() => Class, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Class

  @Column({ length: 255 })
  title: string

  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number
}
