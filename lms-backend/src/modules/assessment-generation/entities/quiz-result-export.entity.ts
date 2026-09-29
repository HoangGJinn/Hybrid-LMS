import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { QuizInstance } from './quiz-instance.entity.js'

@Entity('quiz_result_exports')
export class QuizResultExport {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'quiz_instance_id' })
  quizInstanceId: string

  @ManyToOne(() => QuizInstance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_instance_id' })
  quizInstance: QuizInstance

  @Column({ name: 'file_url', length: 1000 })
  fileUrl: string

  @CreateDateColumn({ name: 'exported_at', type: 'timestamptz' })
  readonly exportedAt: Date
}
