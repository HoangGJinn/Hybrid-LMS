export const quizKeys = {
  all: ['quizzes'] as const,
  mine: ['quizzes', 'me'] as const,
  detail: (quizId: string) => ['quizzes', 'detail', quizId] as const,
  result: (quizId: string) => ['quizzes', 'result', quizId] as const,
  practice: (classId: string, documentId: string) =>
    ['quizzes', 'practice', classId, documentId] as const,
};
