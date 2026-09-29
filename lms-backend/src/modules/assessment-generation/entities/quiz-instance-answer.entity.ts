import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { QuizInstanceQuestion } from './quiz-instance-question.entity.js'
import { Student } from '../../user/entities/student.entity.js'

@Entity('quiz_instance_answers')
export class QuizInstanceAnswer {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'question_id' })
  questionId: string

  @ManyToOne(() => QuizInstanceQuestion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: QuizInstanceQuestion

  @Column({ name: 'student_id' })
  studentId: string

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student

  @Column({ name: 'selected_option', length: 255 })
  selectedOption: string

  @Column({ name: 'is_correct' })
  isCorrect: boolean

  @CreateDateColumn({ name: 'answered_at', type: 'timestamptz' })
  readonly answeredAt: Date
}
