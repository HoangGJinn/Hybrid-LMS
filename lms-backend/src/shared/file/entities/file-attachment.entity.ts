import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { FileStatus } from '../enums/file-status.enum.js';

@Entity('file_attachments')
export class FileAttachment {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  /** User who requested the upload; only they may confirm it or attach the file. Null for legacy rows. */
  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId: string | null;

  /** Original name, kept only in the database; the S3 key never contains it. */
  @Column({ name: 'file_name', length: 255 })
  fileName: string;

  /** Object key inside the S3 bucket (for example `documents/{lecturerId}/{fileId}.pdf`), never a full URL. */
  @Column({ name: 'storage_key', length: 500 })
  storageKey: string;

  @Column({ name: 'file_type', length: 100 })
  fileType: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: number;

  @Column({ type: 'enum', enum: FileStatus, default: FileStatus.PENDING })
  status: FileStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  readonly createdAt: Date;
}
