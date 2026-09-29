import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { Document } from './document.entity.js'

@Entity('document_text_segments')
export class DocumentTextSegment {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'document_id' })
  documentId: string

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document

  @Column({ name: 'segment_index', type: 'int' })
  segmentIndex: number

  @Column({ name: 'raw_text', type: 'text' })
  rawText: string
}
