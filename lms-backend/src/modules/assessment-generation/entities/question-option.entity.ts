import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Question } from './question.entity.js';

@Entity('question_options')
@Index('uq_question_options_question_label', ['questionId', 'optionLabel'], {
  unique: true,
})
export class QuestionOption {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @Column({ name: 'question_id' })
  questionId: string;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column({ name: 'option_label', length: 5 })
  optionLabel: string;

  @Column({ name: 'option_text', type: 'text' })
  optionText: string;

  @Column({ name: 'is_correct', default: false })
  isCorrect: boolean;

  /** Phương pháp sinh đáp án gây nhiễu; null nếu do giảng viên nhập. */
  @Column({
    name: 'generation_method',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  generationMethod: string | null;
}