import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

export enum Role {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
}

export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ unique: true })
  username: string

  @Column({ name: 'full_name' })
  fullName: string

  @Column({ unique: true })
  email: string

  @Column({ type: 'text', nullable: true, select: false })
  password: string | null

  @Column({ type: 'text', name: 'google_id', nullable: true, unique: true })
  googleId: string | null

  @Column({ type: 'enum', enum: Role, default: Role.STUDENT })
  role: Role

  @Column({ type: 'enum', enum: AuthProvider, default: AuthProvider.LOCAL, name: 'auth_provider' })
  authProvider: AuthProvider

  @Column({ name: 'is_active', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  readonly createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  readonly updatedAt: Date
}
