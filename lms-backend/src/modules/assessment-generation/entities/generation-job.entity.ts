import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'
import { GenerationJobStatus } from '../enums/generation-job-status.enum.js'

@Entity('generation_jobs')
export class GenerationJob {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ length: 100 })
  method: string

  @Column({ name: 'model_name', length: 100 })
  modelName: string

  @Column({ name: 'method_config', type: 'jsonb', nullable: true })
  methodConfig: Record<string, any> | null

  @Column({ type: 'enum', enum: GenerationJobStatus, default: GenerationJobStatus.PENDING })
  status: GenerationJobStatus

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  readonly createdAt: Date

  @Column({ name: 'needs_attention', default: false })
  needsAttention: boolean
}
