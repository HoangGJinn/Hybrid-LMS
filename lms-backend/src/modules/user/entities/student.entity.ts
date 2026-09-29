import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn } from 'typeorm'
import { User } from './user.entity.js'
import { StudentStatus } from '../enums/student-status.enum.js'

@Entity('students')
export class Student {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ name: 'student_code', length: 50, unique: true })
  studentCode: string

  @Column({ type: 'enum', enum: StudentStatus, default: StudentStatus.STUDYING })
  status: StudentStatus
}
