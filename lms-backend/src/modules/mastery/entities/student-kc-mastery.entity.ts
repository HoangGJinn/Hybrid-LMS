import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { Student } from '../../user/entities/student.entity.js'
import { KnowledgeComponent } from '../../document/entities/knowledge-component.entity.js'

@Entity('student_kc_mastery')
export class StudentKcMastery {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'student_id' })
  studentId: string

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student

  @Column({ name: 'kc_id' })
  kcId: string

  @ManyToOne(() => KnowledgeComponent)
  @JoinColumn({ name: 'kc_id' })
  knowledgeComponent: KnowledgeComponent

  @Column({ name: 'p_learn', type: 'numeric', precision: 4, scale: 3 })
  pLearn: number

  @Column({ name: 'p_guess', type: 'numeric', precision: 4, scale: 3 })
  pGuess: number

  @Column({ name: 'p_slip', type: 'numeric', precision: 4, scale: 3 })
  pSlip: number

  @Column({ name: 'p_mastery', type: 'numeric', precision: 4, scale: 3 })
  pMastery: number

  @Column({ name: 'attempts_count', type: 'int', default: 0 })
  attemptsCount: number

  @Column({ name: 'last_updated', type: 'timestamptz' })
  lastUpdated: Date
}
