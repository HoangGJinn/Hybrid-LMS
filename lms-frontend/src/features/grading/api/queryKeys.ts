export const gradingKeys = {
  all: ['grading'] as const,
  pending: (classIds: string[]) => ['grading', 'pending', ...classIds] as const,
  examPending: (classIds: string[]) =>
    ['grading', 'exam-pending', ...classIds] as const,
};
