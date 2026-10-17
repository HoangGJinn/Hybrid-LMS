import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm'
import { User } from '../../user/entities/user.entity.js'

/** One issued refresh token. Only a SHA-256 hash is stored, never the token itself. */
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  /** Shared by every token rotated from the same login, so one reuse can revoke the whole chain. */
  @Index()
  @Column({ name: 'family_id', type: 'uuid' })
  familyId: string

  @Column({ name: 'token_hash', type: 'varchar', length: 64, unique: true })
  tokenHash: string

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  readonly createdAt: Date
}
