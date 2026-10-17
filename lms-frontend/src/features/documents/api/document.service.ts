import { USE_MOCK } from '@core/config/env'
import { mockDocuments, delay } from '@core/mocks'
import type { LmsDocument } from '../types/documents.types'
import { get, patch } from '@core/api/http'

export const documentService = {
  getDocuments: (classId: string): Promise<LmsDocument[]> =>
    USE_MOCK ? delay(mockDocuments) : get(`/api/classes/${classId}/documents`),
  getDocument: (id: string): Promise<LmsDocument | undefined> =>
    USE_MOCK ? delay(mockDocuments.find((d) => d.id === id)) : get(`/api/documents/${id}`),
  markSeen: (id: string): Promise<void> => {
    if (!USE_MOCK) return patch(`/api/documents/${id}/seen`)
    const index = mockDocuments.findIndex((d) => d.id === id)
    // Replace instead of mutating so cached copies of the document are not silently changed.
    if (index >= 0) mockDocuments[index] = { ...mockDocuments[index], isSeen: true }
    return delay(undefined)
  },
}
