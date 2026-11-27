import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { KnowledgeComponent } from '../../document/entities/knowledge-component.entity.js';

export type XesMappingStatus = 'SUGGESTED' | 'CONFIRMED';

/**
 * Links a KC of this system to a KC of XES3G5M. The XES KC is identified by its route
 * (first entry of kc_routes in questions.json, e.g. "A----B----C"), the same key the demo script groups by.
 * Only CONFIRMED rows are used to map questions; SUGGESTED rows wait for a lecturer to confirm.
 */
@Entity('kc_xes_mappings')
export class XesKcMapping {
  @PrimaryColumn({ name: 'kc_id', type: 'uuid' })
  kcId: string;

  @ManyToOne(() => KnowledgeComponent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kc_id' })
  knowledgeComponent: KnowledgeComponent;

  @PrimaryColumn({ name: 'xes_route', type: 'text' })
  xesRoute: string;

  /** Cosine similarity between the two KC names when it was suggested. */
  @Column({ type: 'float' })
  score: number;

  @Column({ type: 'varchar', length: 20, default: 'SUGGESTED' })
  status: XesMappingStatus;
}