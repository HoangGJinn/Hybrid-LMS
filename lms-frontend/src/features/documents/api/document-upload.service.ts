import { post } from '@core/api/http';
import { USE_MOCK } from '@core/config/env';
import { delay, mockDocuments } from '@core/mocks';
import type { LmsDocumentSummary } from '../types/documents.types';
import { titleFromFileName } from '../utils/upload-rules';

interface UploadRequest {
  fileId: string;
  upload: { url: string; fields: Record<string, string> };
}

const requestUpload = (file: File): Promise<UploadRequest> =>
  post('/api/files/upload-requests', {
    purpose: 'DOCUMENT',
    fileName: file.name,
    contentType: file.type,
    size: file.size,
  });

/**
 * Sends the file straight to S3. It deliberately does not use the app's HTTP client: S3 authorises the
 * request through the signed fields, and the app's JWT must never be sent to a third party.
 */
const uploadToS3 = async (
  upload: UploadRequest['upload'],
  file: File,
): Promise<void> => {
  const form = new FormData();
  Object.entries(upload.fields).forEach(([name, value]) =>
    form.append(name, value),
  );
  // S3 rejects the request unless the file is the LAST part of the form.
  form.append('file', file);
  const response = await fetch(upload.url, { method: 'POST', body: form });
  if (!response.ok) throw new Error('Uploading the file failed');
};

const confirmUpload = (fileId: string): Promise<void> =>
  post(`/api/files/${fileId}/confirm`);

const createDocument = (
  classId: string,
  fileId: string,
  title: string,
): Promise<LmsDocumentSummary> =>
  post(`/api/classes/${classId}/documents`, { title, fileId });

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
    const { fileId, upload } = await requestUpload(file);
    await uploadToS3(upload, file);
    await confirmUpload(fileId);
    return createDocument(classId, fileId, titleFromFileName(file.name));
  },
};
