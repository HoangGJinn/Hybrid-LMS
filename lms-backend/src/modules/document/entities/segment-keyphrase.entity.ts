import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { DocumentTextSegment } from './document-text-segment.entity.js'

@Entity('segment_keyphrases')
export class SegmentKeyphrase {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'segment_id' })
  segmentId: string

  @ManyToOne(() => DocumentTextSegment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'segment_id' })
  segment: DocumentTextSegment

  @Column({ length: 255 })
  keyphrase: string

  @Column({ name: 'importance_score', type: 'numeric', precision: 4, scale: 3 })
  importanceScore: number
}
