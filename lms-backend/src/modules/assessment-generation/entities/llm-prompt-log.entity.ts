import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { GenerationJob } from './generation-job.entity.js'

@Entity('llm_prompt_logs')
export class LlmPromptLog {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({ name: 'generation_job_id' })
  generationJobId: string

  @ManyToOne(() => GenerationJob, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'generation_job_id' })
  generationJob: GenerationJob

  @Column({ name: 'user_prompt', type: 'text' })
  userPrompt: string

  @Column({ name: 'raw_response', type: 'text' })
  rawResponse: string
}
