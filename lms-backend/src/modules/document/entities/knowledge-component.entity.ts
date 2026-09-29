import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity('knowledge_components')
export class KnowledgeComponent {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ length: 255, unique: true })
  name: string
}
