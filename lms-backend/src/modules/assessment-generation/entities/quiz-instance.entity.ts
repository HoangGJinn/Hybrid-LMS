import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { GenerationJob } from './generation-job.entity.js'
import { Student } from '../../user/entities/student.entity.js'
import { QuizInstanceStatus } from '../enums/quiz-instance-status.enum.js'

@Entity('quiz_instances')
export class QuizInstance {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'generation_job_id' })
  generationJobId: string

  @ManyToOne(() => GenerationJob)
  @JoinColumn({ name: 'generation_job_id' })
  generationJob: GenerationJob

  @Column({ name: 'student_id' })
  studentId: string

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student

  @Column({ name: 'generation_strategy', length: 50 })
  generationStrategy: string

  @Column({ name: 'target_difficulty', length: 20 })
  targetDifficulty: string

  @Column({ name: 'num_questions', type: 'int' })
  numQuestions: number

  @Column({ name: 'random_seed', type: 'varchar', length: 100, nullable: true })
  randomSeed: string | null

  @Column({ type: 'enum', enum: QuizInstanceStatus, default: QuizInstanceStatus.CREATED })
  status: QuizInstanceStatus

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  score: number | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  readonly createdAt: Date

  @Column({ name: 'student_notified', default: false })
  studentNotified: boolean
}
