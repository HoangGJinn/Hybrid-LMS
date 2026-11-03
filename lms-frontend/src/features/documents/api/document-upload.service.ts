import { post } from '@core/api/http';
import { uploadFileToS3 } from '@core/api/s3-upload';
import { USE_MOCK } from '@core/config/env';
import { delay, mockDocuments } from '@core/mocks';
import type { LmsDocumentSummary } from '../types/documents.types';
import { resolveContentType, titleFromFileName } from '../utils/upload-rules';

export const documentUploadService = {
  /** Runs the 4-step S3 flow: request permission, upload to S3, confirm, then create the document. */
  upload: async (classId: string, file: File): Promise<LmsDocumentSummary> => {
    if (USE_MOCK) {
      const document = {
        id: crypto.randomUUID(),
        title: titleFromFileName(file.name),
        uploadedBy: 'lec-001',
        fileName: file.name,
        fileUrl: '#',
        isSeen: false,
      };
      mockDocuments.push(document);
      return delay(document);
    }
    const fileId = await uploadFileToS3(file, {
      purpose: 'DOCUMENT',
      contentType: resolveContentType(file),
    });
    return post(`/api/classes/${classId}/documents`, {
      title: titleFromFileName(file.name),
      fileId,
    });
  },
};