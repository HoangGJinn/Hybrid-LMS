import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Question } from './question.entity.js';
import { KnowledgeComponent } from '../../document/entities/knowledge-component.entity.js';
import { KcAssignedBy } from '../enums/kc-assigned-by.enum.js';

@Entity('question_knowledge_components')
export class QuestionKnowledgeComponent {
  @PrimaryColumn({ name: 'question_id', type: 'uuid' })
  questionId: string;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @PrimaryColumn({ name: 'kc_id', type: 'uuid' })
  kcId: string;

  @ManyToOne(() => KnowledgeComponent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kc_id' })
  knowledgeComponent: KnowledgeComponent;

  @Column({ name: 'assigned_by', type: 'enum', enum: KcAssignedBy })
  assignedBy: KcAssignedBy;
}