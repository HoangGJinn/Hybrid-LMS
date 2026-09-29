import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

import { Role } from '../../../common/enums/role.enum.js'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ unique: true })
  email: string

  @Column({ name: 'full_name' })
  fullName: string

  @Column({ name: 'sso_id', unique: true })
  ssoId: string

  @Column({ name: 'sso_provider', type: 'varchar', length: 50 })
  ssoProvider: string

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string | null

  @Column({ type: 'enum', enum: Role, default: Role.STUDENT })
  role: Role

  @Column({ name: 'is_active', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  readonly createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  readonly updatedAt: Date
}
