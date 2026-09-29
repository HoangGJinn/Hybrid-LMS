import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity('exam_modes')
export class ExamMode {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ length: 100, unique: true })
  name: string
}
