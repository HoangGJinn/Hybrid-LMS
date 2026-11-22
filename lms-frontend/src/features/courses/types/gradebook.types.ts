export type GradeColumnKind = 'assignment' | 'quiz' | 'midterm';

export interface GradeColumn {
  id: string;
  label: string;
  kind: GradeColumnKind;
  sectionId: string;
  sectionName: string;
}

export interface GradeRow {
  studentId: string;
  studentCode: string;
  fullName: string;
  scores: Record<string, number | null>;
  processAvg: number | null;
  testAvg: number | null;
}

export interface GradebookSummary {
  studentCount: number;
  processAvg: number | null;
  testAvg: number | null;
  belowThresholdCount: number;
  threshold: number;
}

export interface Gradebook {
  classId: string;
  classCode: string;
  columns: GradeColumn[];
  summary: GradebookSummary;
  rows: GradeRow[];
  page: number;
  limit: number;
  total: number;
}

export interface GradebookParams {
  search?: string;
  page?: number;
  limit?: number;
}