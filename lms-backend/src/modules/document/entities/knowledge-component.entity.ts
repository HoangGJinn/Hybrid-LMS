import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Subject } from '../../academic/entities/subject.entity.js';

@Entity('knowledge_components')
@Index('uq_knowledge_components_subject_name', ['subjectId', 'name'], {
  unique: true,
})
@Index('uq_knowledge_components_subject_kt_idx', ['subjectId', 'ktConceptIdx'], {
  unique: true,
})
export class KnowledgeComponent {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'subject_id' })
  subjectId: string;

  @ManyToOne(() => Subject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  /** Chỉ số nguyên của KC dùng làm ID khái niệm đầu vào của mô hình ENAS-KT (duy nhất trong môn học). */
  @Column({ name: 'kt_concept_idx', type: 'int' })
  ktConceptIdx: number;
}