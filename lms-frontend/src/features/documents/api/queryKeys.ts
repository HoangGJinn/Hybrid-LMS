export const documentKeys = {
  all: ['documents'] as const,
  byClass: (classId: string) => ['documents', 'class', classId] as const,
  detail: (documentId: string) => ['documents', 'detail', documentId] as const,
}
