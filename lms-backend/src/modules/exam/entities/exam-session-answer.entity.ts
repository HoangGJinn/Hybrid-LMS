import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { ExamQuestionOption } from './exam-question-option.entity.js';
import { ExamQuestion } from './exam-question.entity.js';
import { ExamSession } from './exam-session.entity.js';

/** One student's selected option for one question in an exam attempt. */
@Entity('exam_session_answers')
export class ExamSessionAnswer {
  @PrimaryColumn({ name: 'exam_session_id', type: 'uuid' })
  examSessionId: string;

  @ManyToOne(() => ExamSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_session_id' })
  examSession: ExamSession;

  @PrimaryColumn({ name: 'question_id', type: 'uuid' })
  questionId: string;

  @ManyToOne(() => ExamQuestion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: ExamQuestion;

  @Column({ name: 'selected_option_id', type: 'uuid' })
  selectedOptionId: string;

  @ManyToOne(() => ExamQuestionOption, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'selected_option_id' })
  selectedOption: ExamQuestionOption;

  @Column({ name: 'answered_at', type: 'timestamptz', default: () => 'now()' })
  answeredAt: Date;
}

