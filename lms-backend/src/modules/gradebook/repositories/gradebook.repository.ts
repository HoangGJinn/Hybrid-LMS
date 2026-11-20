import type {
  GradeColumnDef,
  GradeScoreRow,
  GradeStudent,
} from '../types/gradebook.types.js';

export abstract class GradebookRepository {
  abstract getClassCode(classId: string): Promise<string>;
  abstract listColumns(classId: string): Promise<GradeColumnDef[]>;
  abstract listStudents(classId: string): Promise<GradeStudent[]>;
  abstract listScores(classId: string): Promise<GradeScoreRow[]>;
}