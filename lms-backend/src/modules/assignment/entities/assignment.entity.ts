import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { SubmissionType } from '../enums/submission-type.enum.js';

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ name: 'open_at', type: 'timestamptz' })
  openAt: Date;

  @Column({ name: 'end_at', type: 'timestamptz' })
  endAt: Date;

  @Column({ type: 'text' })
  instruction: string;

  @Column({ name: 'is_seen', default: false })
  isSeen: boolean;

  /** FILE: students upload files; TEXT: students write the answer online. */
  @Column({
    name: 'submission_type',
    type: 'varchar',
    length: 10,
    default: SubmissionType.FILE,
  })
  submissionType: SubmissionType;

  /** Accepted file formats such as `py`, `cpp`, `zip`; empty means any supported format. */
  @Column({
    name: 'accepted_extensions',
    type: 'text',
    array: true,
    default: () => "'{}'",
  })
  acceptedExtensions: string[];

  /** The lecturer's note on what to submit and how. */
  @Column({ name: 'submission_note', type: 'text', nullable: true })
  submissionNote: string | null;

  /** When the assignment was created; the clean-up job uses it to tell a fresh draft from an abandoned one. */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  readonly createdAt: Date;

  /** The lecturer who created it, kept for tracing. Null for rows created before this column existed. */
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;
}