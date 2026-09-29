import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Assignment } from './assignment.entity.js'
import { FileAttachment } from '../../../shared/file/entities/file-attachment.entity.js'

@Entity('assignment_files')
export class AssignmentFile {
  @PrimaryColumn({ name: 'assignment_id', type: 'uuid' })
  assignmentId: string

  @ManyToOne(() => Assignment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignment_id' })
  assignment: Assignment

  @PrimaryColumn({ name: 'file_id', type: 'uuid' })
  fileId: string

  @ManyToOne(() => FileAttachment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: FileAttachment
}
