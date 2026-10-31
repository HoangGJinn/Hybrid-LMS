import { USE_MOCK } from '@core/config/env';
import { mockDocuments, delay } from '@core/mocks';
import type { LmsDocument, LmsDocumentSummary } from '../types/documents.types';
import { get, patch } from '@core/api/http';

export const documentService = {
  getDocuments: (classId: string): Promise<LmsDocumentSummary[]> =>
    USE_MOCK ? delay(mockDocuments) : get(`/api/classes/${classId}/documents`),
  /** Every call returns a freshly signed `fileUrl` that expires after a few minutes. */
  getDocument: (
    classId: string,
    documentId: string,
  ): Promise<LmsDocument | undefined> =>
    USE_MOCK
      ? delay(mockDocuments.find((d) => d.id === documentId))
      : get(`/api/classes/${classId}/documents/${documentId}`),
  markSeen: (classId: string, documentId: string): Promise<void> => {
    if (!USE_MOCK)
      return patch(`/api/classes/${classId}/documents/${documentId}/seen`);
    const index = mockDocuments.findIndex((d) => d.id === documentId);
    // Replace instead of mutating so cached copies of the document are not silently changed.
    if (index >= 0)
      mockDocuments[index] = { ...mockDocuments[index], isSeen: true };
    return delay(undefined);
  },
};
