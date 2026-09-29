import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { QuizInstance } from '../../assessment-generation/entities/quiz-instance.entity.js'
import { StudentSubjectCompetency } from './student-subject-competency.entity.js'

@Entity('student_competency_history')
export class StudentCompetencyHistory {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'quiz_instance_id' })
  quizInstanceId: string

  @ManyToOne(() => QuizInstance)
  @JoinColumn({ name: 'quiz_instance_id' })
  quizInstance: QuizInstance

  @Column({ name: 'subject_competency_id' })
  subjectCompetencyId: string

  @ManyToOne(() => StudentSubjectCompetency, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subject_competency_id' })
  subjectCompetency: StudentSubjectCompetency

  @Column({ name: 'ability_score_before', type: 'numeric', precision: 5, scale: 2 })
  abilityScoreBefore: number

  @Column({ name: 'ability_score_after', type: 'numeric', precision: 5, scale: 2 })
  abilityScoreAfter: number

  @CreateDateColumn({ name: 'recorded_at', type: 'timestamptz' })
  readonly recordedAt: Date
}
