import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Subject } from '../../academic/entities/subject.entity.js';
import { Lecturer } from '../../user/entities/lecturer.entity.js';
import { FileAttachment } from '../../../shared/file/entities/file-attachment.entity.js';
import { ImportBatchStatus } from '../enums/import-batch-status.enum.js';

@Entity('question_import_batches')
export class QuestionImportBatch {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @Column({ name: 'subject_id' })
  subjectId: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ name: 'uploaded_by' })
  uploadedBy: string;

  @ManyToOne(() => Lecturer)
  @JoinColumn({ name: 'uploaded_by' })
  uploader: Lecturer;

  @Column({ name: 'file_id' })
  fileId: string;

  @ManyToOne(() => FileAttachment)
  @JoinColumn({ name: 'file_id' })
  file: FileAttachment;

  @Column({
    type: 'enum',
    enum: ImportBatchStatus,
    default: ImportBatchStatus.PROCESSING,
  })
  status: ImportBatchStatus;

  @Column({ name: 'total_rows', type: 'int', default: 0 })
  totalRows: number;

  @Column({ name: 'success_rows', type: 'int', default: 0 })
  successRows: number;

  @Column({ name: 'failed_rows', type: 'int', default: 0 })
  failedRows: number;

  @Column({ name: 'error_report', type: 'jsonb', nullable: true })
  errorReport: Record<string, any>[] | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  readonly createdAt: Date;
}