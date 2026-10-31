export const documentKeys = {
  all: ['documents'] as const,
  byClass: (classId: string) => ['documents', 'class', classId] as const,
  detail: (classId: string, documentId: string) =>
    ['documents', 'detail', classId, documentId] as const,
};
