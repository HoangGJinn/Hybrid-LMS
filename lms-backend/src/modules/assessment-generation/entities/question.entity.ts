import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Generated,
} from 'typeorm';
import { Subject } from '../../academic/entities/subject.entity.js';
import { Lecturer } from '../../user/entities/lecturer.entity.js';
import { DocumentTextSegment } from '../../document/entities/document-text-segment.entity.js';
import { QuestionImportBatch } from './question-import-batch.entity.js';
import { GenerationJob } from './generation-job.entity.js';
import { QuestionSource } from '../enums/question-source.enum.js';
import { QuestionDifficulty } from '../enums/question-difficulty.enum.js';
import { QuestionReviewStatus } from '../enums/question-review-status.enum.js';

@Entity('questions')
@Index('uq_questions_subject_content_hash', ['subjectId', 'contentHash'], {
  unique: true,
})
export class Question {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @Column({ name: 'subject_id' })
  subjectId: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ type: 'enum', enum: QuestionSource })
  source: QuestionSource;

  @Column({ name: 'import_batch_id', type: 'uuid', nullable: true })
  importBatchId: string | null;

  @ManyToOne(() => QuestionImportBatch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'import_batch_id' })
  importBatch: QuestionImportBatch | null;

  @Column({ name: 'generation_job_id', type: 'uuid', nullable: true })
  generationJobId: string | null;

  @ManyToOne(() => GenerationJob, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'generation_job_id' })
  generationJob: GenerationJob | null;

  @Column({ name: 'segment_id', type: 'uuid', nullable: true })
  segmentId: string | null;

  @ManyToOne(() => DocumentTextSegment, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'segment_id' })
  segment: DocumentTextSegment | null;

  @Column({ name: 'question_text', type: 'text' })
  questionText: string;

  @Column({ type: 'enum', enum: QuestionDifficulty })
  difficulty: QuestionDifficulty;

  @Column({ type: 'text', nullable: true })
  explanation: string | null;

  @Column({
    name: 'review_status',
    type: 'enum',
    enum: QuestionReviewStatus,
    default: QuestionReviewStatus.PENDING_REVIEW,
  })
  reviewStatus: QuestionReviewStatus;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @ManyToOne(() => Lecturer, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: Lecturer | null;

  @Column({ name: 'content_hash', length: 64 })
  contentHash: string;

  /** Chỉ số nguyên duy nhất của câu hỏi, dùng làm ID đầu vào cho mô hình ENAS-KT. */
  @Column({ name: 'kt_question_idx', type: 'int', unique: true })
  @Generated('increment')
  ktQuestionIdx: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  readonly createdAt: Date;
}