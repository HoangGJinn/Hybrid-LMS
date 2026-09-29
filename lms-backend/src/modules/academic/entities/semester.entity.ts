import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity('semesters')
export class Semester {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'semester_code', length: 50, unique: true })
  semesterCode: string

  @Column({ length: 255 })
  name: string

  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate: Date

  @Column({ name: 'end_date', type: 'timestamptz' })
  endDate: Date
}
