export const quizKeys = {
  all: ['quizzes'] as const,
  mine: ['quizzes', 'me'] as const,
  detail: (quizId: string) => ['quizzes', 'detail', quizId] as const,
};
