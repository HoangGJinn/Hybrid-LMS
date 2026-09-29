import { Entity, PrimaryColumn, OneToOne, JoinColumn } from 'typeorm'
import { User } from './user.entity.js'

@Entity('admins')
export class Admin {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User
}
