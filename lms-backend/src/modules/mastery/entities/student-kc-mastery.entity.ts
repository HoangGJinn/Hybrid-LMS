import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Student } from '../../user/entities/student.entity.js';
import { KnowledgeComponent } from '../../document/entities/knowledge-component.entity.js';

/**
 * Mức hiểu biết hiện tại của một sinh viên về một KC, tính bằng ENAS-KT.
 * p_mastery = trung bình P(đúng) mà model dự đoán trên một mẫu câu hỏi của KC, sau lịch sử làm bài của sinh viên
 * (xem EnasMasteryService / màn hình /monitor của enas_gateway.py). Các tham số BKT cũ (p_learn, p_guess,
 * p_slip) không còn: ENAS không có các tham số này.
 */
@Entity('student_kc_mastery')
@Index('uq_student_kc_mastery_student_kc', ['studentId', 'kcId'], { unique: true })
export class StudentKcMastery {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'kc_id' })
  kcId: string;

  @ManyToOne(() => KnowledgeComponent)
  @JoinColumn({ name: 'kc_id' })
  knowledgeComponent: KnowledgeComponent;

  /** 0..1. Trung bình P(đúng) do ENAS dự đoán (hoặc tỉ lệ đúng gần đây khi model không dùng được, xem `source`). */
  @Column({ name: 'p_mastery', type: 'numeric', precision: 4, scale: 3 })
  pMastery: number;

  /** Giá trị p_mastery ở lần cập nhật trước, null ở lần đầu: dùng để hiện xu hướng tăng/giảm. */
  @Column({ name: 'p_prev', type: 'numeric', precision: 4, scale: 3, nullable: true })
  pPrev: number | null;

  /** Số câu hỏi (XES) thực sự được model chấm để ra p_mastery; càng ít thì càng kém tin cậy. */
  @Column({ name: 'sample_size', type: 'int', default: 0 })
  sampleSize: number;

  /** Tổng số câu sinh viên đã trả lời thuộc KC này. */
  @Column({ name: 'attempts_count', type: 'int', default: 0 })
  attemptsCount: number;

  @Column({ name: 'correct_count', type: 'int', default: 0 })
  correctCount: number;

  /** 'enas' = do model dự đoán, 'history' = tỉ lệ đúng trong các câu gần nhất (dự phòng khi gateway tắt). */
  @Column({ type: 'varchar', length: 10, default: 'enas' })
  source: 'enas' | 'history';

  /** Số thứ tự lần dự đoán trong log của enas_gateway (/monitor), để truy ngược cách tính. */
  @Column({ name: 'enas_log_seq', type: 'int', nullable: true })
  enasLogSeq: number | null;

  /** Chế độ time_lag lúc dự đoán ('fixed' | 'real'). */
  @Column({ name: 'lag_mode', type: 'varchar', length: 10, nullable: true })
  lagMode: string | null;

  @Column({ name: 'last_updated', type: 'timestamptz' })
  lastUpdated: Date;
}
