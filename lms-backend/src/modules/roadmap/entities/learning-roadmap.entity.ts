import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Student } from '../../user/entities/student.entity.js'
import { Subject } from '../../academic/entities/subject.entity.js'

@Entity('learning_roadmaps')
export class LearningRoadmap {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'student_id' })
  studentId: string

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student

  @Column({ name: 'subject_id' })
  subjectId: string

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject: Subject

  @Column({ length: 255 })
  title: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  readonly createdAt: Date
}
