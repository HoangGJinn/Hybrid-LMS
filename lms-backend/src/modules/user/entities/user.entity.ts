import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Role } from '../../../common/enums/role.enum.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'full_name' })
  fullName: string;

  /** Google account id. Null while the account is pre-provisioned and nobody has signed in yet. */
  @Column({ name: 'sso_id', type: 'varchar', unique: true, nullable: true })
  ssoId: string | null;

  @Column({ name: 'sso_provider', type: 'varchar', length: 50, nullable: true })
  ssoProvider: string | null;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'enum', enum: Role, default: Role.STUDENT })
  role: Role;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  readonly createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  readonly updatedAt: Date;
}
