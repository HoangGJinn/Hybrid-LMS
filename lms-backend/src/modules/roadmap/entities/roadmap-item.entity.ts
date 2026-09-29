import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { LearningRoadmap } from './learning-roadmap.entity.js'
import { KnowledgeComponent } from '../../document/entities/knowledge-component.entity.js'
import { RoadmapItemStatus } from '../enums/roadmap-item-status.enum.js'

@Entity('roadmap_items')
export class RoadmapItem {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'roadmap_id' })
  roadmapId: string

  @ManyToOne(() => LearningRoadmap, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roadmap_id' })
  roadmap: LearningRoadmap

  @Column({ name: 'kc_id' })
  kcId: string

  @ManyToOne(() => KnowledgeComponent)
  @JoinColumn({ name: 'kc_id' })
  knowledgeComponent: KnowledgeComponent

  @Column({ type: 'text', nullable: true })
  reason: string | null

  @Column({ name: 'priority_score', type: 'numeric', precision: 5, scale: 2 })
  priorityScore: number

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date | null

  @Column({ type: 'enum', enum: RoadmapItemStatus, default: RoadmapItemStatus.PENDING })
  status: RoadmapItemStatus

  @Column({ default: false })
  notified: boolean
}
