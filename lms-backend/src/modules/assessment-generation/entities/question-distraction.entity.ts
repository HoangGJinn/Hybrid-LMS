import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { QuizInstanceQuestion } from './quiz-instance-question.entity.js'

@Entity('question_distractions')
export class QuestionDistraction {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'question_id' })
  questionId: string

  @ManyToOne(() => QuizInstanceQuestion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: QuizInstanceQuestion

  @Column({ name: 'distractor_text', type: 'text' })
  distractorText: string

  @Column({ name: 'generation_method', type: 'varchar', length: 50, nullable: true })
  generationMethod: string | null
}
