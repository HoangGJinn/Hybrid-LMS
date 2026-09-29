import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { Subject } from './subject.entity.js'
import { Semester } from './semester.entity.js'
import { Lecturer } from '../../user/entities/lecturer.entity.js'

@Entity('classes')
export class Class {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'class_code', length: 50, unique: true })
  classCode: string

  @Column({ length: 255 })
  name: string

  @Column({ name: 'subject_id' })
  subjectId: string

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject: Subject

  @Column({ name: 'semester_id' })
  semesterId: string

  @ManyToOne(() => Semester)
  @JoinColumn({ name: 'semester_id' })
  semester: Semester

  @Column({ name: 'lecturer_id' })
  lecturerId: string

  @ManyToOne(() => Lecturer)
  @JoinColumn({ name: 'lecturer_id' })
  lecturer: Lecturer
}
