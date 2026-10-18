export const gradingKeys = {
  all: ['grading'] as const,
  pending: (classIds: string[]) => ['grading', 'pending', ...classIds] as const,
};
