import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { QuizInstance } from './quiz-instance.entity.js'
import { DocumentTextSegment } from '../../document/entities/document-text-segment.entity.js'

@Entity('quiz_instance_questions')
export class QuizInstanceQuestion {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'quiz_instance_id' })
  quizInstanceId: string

  @ManyToOne(() => QuizInstance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_instance_id' })
  quizInstance: QuizInstance

  @Column({ name: 'segment_id' })
  segmentId: string

  @ManyToOne(() => DocumentTextSegment)
  @JoinColumn({ name: 'segment_id' })
  segment: DocumentTextSegment

  @Column({ name: 'question_text', type: 'text' })
  questionText: string

  @Column({ name: 'correct_answer', type: 'text' })
  correctAnswer: string

  @Column({ name: 'estimate_difficulty', type: 'varchar', length: 20, nullable: true })
  estimateDifficulty: string | null

  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number
}
