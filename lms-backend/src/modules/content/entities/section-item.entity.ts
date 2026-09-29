import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { Section } from './section.entity.js'
import { ItemType } from '../enums/item-type.enum.js'

@Entity('section_items')
export class SectionItem {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'section_id' })
  sectionId: string

  @ManyToOne(() => Section, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'section_id' })
  section: Section

  @Column({ name: 'item_type', type: 'enum', enum: ItemType })
  itemType: ItemType

  @Column({ length: 255 })
  title: string

  @Column({ name: 'external_url', type: 'varchar', length: 500, nullable: true })
  externalUrl: string | null

  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number

  // Note: document_id và assignment_id giữ dạng string (không @ManyToOne)
  // để tránh tight coupling giữa Content → Document/Assignment.
  // Facade của Document/Assignment sẽ được gọi khi cần JOIN dữ liệu.
  @Column({ name: 'document_id', type: 'uuid', nullable: true })
  documentId: string | null

  @Column({ name: 'assignment_id', type: 'uuid', nullable: true })
  assignmentId: string | null
}
