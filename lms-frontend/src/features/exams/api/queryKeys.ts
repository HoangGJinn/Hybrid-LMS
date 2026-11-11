export const examKeys = {
  all: ['exams'] as const,
  upcoming: ['exams', 'upcoming'] as const,
  detail: (examId: string) => ['exams', 'detail', examId] as const,
  questions: (examId: string) => ['exams', 'questions', examId] as const,
  lecturerDetail: (classId: string, examId: string) =>
    ['exams', 'lecturer', classId, examId] as const,
};
