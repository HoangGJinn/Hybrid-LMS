import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity('subjects')
export class Subject {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'subject_code', length: 50, unique: true })
  subjectCode: string

  @Column({ length: 255 })
  name: string

  @Column({ type: 'text', nullable: true })
  description: string | null
}
