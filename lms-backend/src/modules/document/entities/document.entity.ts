import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { Lecturer } from '../../user/entities/lecturer.entity.js'
import { FileAttachment } from '../../../shared/file/entities/file-attachment.entity.js'

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'uploaded_by' })
  uploadedBy: string

  @ManyToOne(() => Lecturer)
  @JoinColumn({ name: 'uploaded_by' })
  lecturer: Lecturer

  @Column({ length: 255 })
  title: string

  @Column({ name: 'file_id' })
  fileId: string

  @ManyToOne(() => FileAttachment)
  @JoinColumn({ name: 'file_id' })
  file: FileAttachment

  @Column({ name: 'is_seen', default: false })
  isSeen: boolean
}
