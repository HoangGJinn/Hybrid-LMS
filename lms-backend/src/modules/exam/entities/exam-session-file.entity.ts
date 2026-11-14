import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { FileAttachment } from '../../../shared/file/entities/file-attachment.entity.js';
import { ExamSession } from './exam-session.entity.js';

@Entity('exam_session_files')
export class ExamSessionFile {
  @PrimaryColumn({ name: 'exam_session_id', type: 'uuid' })
  examSessionId: string;

  @ManyToOne(() => ExamSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_session_id' })
  examSession: ExamSession;

  @PrimaryColumn({ name: 'file_id', type: 'uuid' })
  fileId: string;

  @ManyToOne(() => FileAttachment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: FileAttachment;
}

