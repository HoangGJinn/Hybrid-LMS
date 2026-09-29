import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm'
import { StudentKcMastery } from './student-kc-mastery.entity.js'

@Entity('student_kc_review_schedule')
export class StudentKcReviewSchedule {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'mastery_id' })
  masteryId: string

  @OneToOne(() => StudentKcMastery, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mastery_id' })
  mastery: StudentKcMastery

  @Column({ name: 'interval_days', type: 'int' })
  intervalDays: number

  @Column({ name: 'ease_factor', type: 'numeric', precision: 4, scale: 2 })
  easeFactor: number

  @Column({ name: 'next_review_at', type: 'timestamptz' })
  nextReviewAt: Date
}
