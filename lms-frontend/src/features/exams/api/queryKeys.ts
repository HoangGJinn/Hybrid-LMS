export const examKeys = {
  all: ['exams'] as const,
  upcoming: ['exams', 'upcoming'] as const,
  detail: (examId: string) => ['exams', 'detail', examId] as const,
  questions: (examId: string) => ['exams', 'questions', examId] as const,
  studentLobby: (classId: string, examId: string) =>
    ['exams', 'student-lobby', classId, examId] as const,
  attemptReview: (sessionId: string) =>
    ['exams', 'attempt-review', sessionId] as const,
  lecturerDetail: (classId: string, examId: string) =>
    ['exams', 'lecturer', classId, examId] as const,
  lecturerResults: (classId: string, examId: string) =>
    ['exams', 'lecturer-results', classId, examId] as const,
  lecturerAttemptReview: (
    classId: string,
    examId: string,
    sessionId: string,
  ) => ['exams', 'lecturer-attempt-review', classId, examId, sessionId] as const,
};

