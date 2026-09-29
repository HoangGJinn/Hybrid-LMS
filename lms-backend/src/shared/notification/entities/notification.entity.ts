import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { User } from '../../../modules/user/entities/user.entity.js'
import { NotificationType } from '../enums/notification-type.enum.js'

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'user_id' })
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType

  @Column({ length: 255 })
  title: string

  @Column({ type: 'text' })
  message: string

  @Column({ name: 'related_table', type: 'varchar', length: 100, nullable: true })
  relatedTable: string | null

  @Column({ name: 'related_id', type: 'uuid', nullable: true })
  relatedId: string | null

  @Column({ name: 'is_read', default: false })
  isRead: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  readonly createdAt: Date

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null
}
