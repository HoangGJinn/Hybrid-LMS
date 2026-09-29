import { Entity, PrimaryColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Class } from './class.entity.js'
import { Student } from '../../user/entities/student.entity.js'

@Entity('class_students')
export class ClassStudent {
  @PrimaryColumn({ name: 'class_id', type: 'uuid' })
  classId: string

  @PrimaryColumn({ name: 'student_id', type: 'uuid' })
  studentId: string

  @ManyToOne(() => Class)
  @JoinColumn({ name: 'class_id' })
  class: Class

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student

  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  readonly joinedAt: Date
}
