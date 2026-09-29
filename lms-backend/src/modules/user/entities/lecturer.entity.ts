import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn } from 'typeorm'
import { User } from './user.entity.js'
import { LecturerStatus } from '../enums/lecturer-status.enum.js'

@Entity('lecturers')
export class Lecturer {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ name: 'lecturer_code', length: 50, unique: true })
  lecturerCode: string

  @Column({ type: 'enum', enum: LecturerStatus, default: LecturerStatus.WORKING })
  status: LecturerStatus
}
