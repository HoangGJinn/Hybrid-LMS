import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ length: 255 })
  title: string

  @Column({ name: 'open_at', type: 'timestamptz' })
  openAt: Date

  @Column({ name: 'end_at', type: 'timestamptz' })
  endAt: Date

  @Column({ type: 'text' })
  instruction: string

  @Column({ name: 'is_seen', default: false })
  isSeen: boolean
}
