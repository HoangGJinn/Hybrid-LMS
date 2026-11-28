import { useStudentExamLobby } from './useExams';

/** Loads the student's lobby overview for an exam in a course. */
export const useExamRoom = (classId: string, examId: string) =>
  useStudentExamLobby(classId, examId);
