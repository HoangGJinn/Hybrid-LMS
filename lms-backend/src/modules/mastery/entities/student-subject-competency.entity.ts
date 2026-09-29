import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { Student } from '../../user/entities/student.entity.js'
import { Subject } from '../../academic/entities/subject.entity.js'

@Entity('student_subject_competency')
export class StudentSubjectCompetency {
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

  @Column({ name: 'ability_score', type: 'numeric', precision: 5, scale: 2 })
  abilityScore: number

  @Column({ name: 'quizzes_taken', type: 'int', default: 0 })
  quizzesTaken: number
}
