// Public API of the "exams" feature. Import from "@features/exams" outside this folder.
export { CreateExamDialog } from './components/CreateExamDialog';
export { useCreateExam } from './hooks/useCreateExam';
export { useExam } from './hooks/useExam';
export { useLecturerExam } from './hooks/useLecturerExam';
export { useRemoveExam } from './hooks/useRemoveExam';
export { useUpcomingExams } from './hooks/useExams';
export { examKeys } from './api/queryKeys';
export type {
  ExamFileLink,
  ExamFormat,
  ExamSchedule,
  ExamSession,
  ExamSessionStatus,
  GradeExamSessionInput,
  LecturerExam,
  LecturerExamAttemptItem,
  NewExamInput,
} from './types/exams.types';
