import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { DocumentTextSegment } from './document-text-segment.entity.js'
import { KnowledgeComponent } from './knowledge-component.entity.js'

@Entity('segment_knowledge_components')
export class SegmentKnowledgeComponent {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'segment_id' })
  segmentId: string

  @ManyToOne(() => DocumentTextSegment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'segment_id' })
  segment: DocumentTextSegment

  @Column({ name: 'kc_id' })
  kcId: string

  @ManyToOne(() => KnowledgeComponent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kc_id' })
  knowledgeComponent: KnowledgeComponent

  @Column({ name: 'relevance_score', type: 'numeric', precision: 4, scale: 3 })
  relevanceScore: number
}
