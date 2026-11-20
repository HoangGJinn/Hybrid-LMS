/** Loại cột điểm: bài tập (BT) thuộc "quá trình"; kiểm tra / giữa kỳ thuộc "kiểm tra". */
export type GradeColumnKind = 'assignment' | 'quiz' | 'midterm';

export interface GradeColumnView {
  id: string;
  /** Nhãn hiển thị: BT1, KT1, Giữa kỳ... */
  label: string;
  kind: GradeColumnKind;
  sectionId: string;
  sectionName: string;
}

export interface GradeRowView {
  studentId: string;
  studentCode: string;
  fullName: string;
  /** columnId -> điểm (thang 10), null = chưa có điểm */
  scores: Record<string, number | null>;
  /** TB các cột bài tập đã có điểm; null nếu chưa có cột nào */
  processAvg: number | null;
  /** TB các cột kiểm tra / giữa kỳ đã có điểm; null nếu chưa có cột nào */
  testAvg: number | null;
}

export interface GradebookSummaryView {
  studentCount: number;
  processAvg: number | null;
  testAvg: number | null;
  belowThresholdCount: number;
  threshold: number;
}

export interface GradebookView {
  classId: string;
  classCode: string;
  columns: GradeColumnView[];
  summary: GradebookSummaryView;
  rows: GradeRowView[];
  page: number;
  limit: number;
  total: number;
}


export interface GradeColumnDef extends GradeColumnView {
  order: number;
}

export interface GradeStudent {
  id: string;
  studentCode: string;
  fullName: string;
}

export interface GradeScoreRow {
  studentId: string;
  columnId: string;
  score: number | null;
}