import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GenerationJobStatus } from '../enums/generation-job-status.enum.js';
import { Subject } from '../../academic/entities/subject.entity.js';
import { Lecturer } from '../../user/entities/lecturer.entity.js';
import { Document } from '../../document/entities/document.entity.js';

@Entity('generation_jobs')
export class GenerationJob {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @Column({ name: 'subject_id' })
  subjectId: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ name: 'requested_by' })
  requestedBy: string;

  @ManyToOne(() => Lecturer)
  @JoinColumn({ name: 'requested_by' })
  requester: Lecturer;

  @Column({ name: 'document_id', type: 'uuid', nullable: true })
  documentId: string | null;

  @ManyToOne(() => Document, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'document_id' })
  document: Document | null;

  @Column({ length: 100 })
  method: string;

  @Column({ name: 'model_name', length: 100 })
  modelName: string;

  @Column({ name: 'method_config', type: 'jsonb', nullable: true })
  methodConfig: Record<string, any> | null;

  @Column({ name: 'num_requested', type: 'int' })
  numRequested: number;

  @Column({ name: 'num_generated', type: 'int', default: 0 })
  numGenerated: number;

  @Column({
    type: 'enum',
    enum: GenerationJobStatus,
    default: GenerationJobStatus.PENDING,
  })
  status: GenerationJobStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  readonly createdAt: Date;

  @Column({ name: 'needs_attention', default: false })
  needsAttention: boolean;
}