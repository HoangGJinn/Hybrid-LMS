import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('file_attachments')
export class FileAttachment {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'file_name', length: 255 })
  fileName: string

  @Column({ name: 'file_url', length: 1000 })
  fileUrl: string

  @Column({ name: 'file_type', length: 100 })
  fileType: string

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  readonly createdAt: Date
}
