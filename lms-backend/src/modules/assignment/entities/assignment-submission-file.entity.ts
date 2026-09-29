import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm'
import { AssignmentSubmission } from './assignment-submission.entity.js'
import { FileAttachment } from '../../../shared/file/entities/file-attachment.entity.js'

@Entity('assignment_submission_files')
export class AssignmentSubmissionFile {
  @PrimaryColumn({ name: 'submission_id', type: 'uuid' })
  submissionId: string

  @ManyToOne(() => AssignmentSubmission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submission_id' })
  submission: AssignmentSubmission

  @PrimaryColumn({ name: 'file_id', type: 'uuid' })
  fileId: string

  @ManyToOne(() => FileAttachment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: FileAttachment
}
