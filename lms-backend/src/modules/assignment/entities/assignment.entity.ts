import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
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
}