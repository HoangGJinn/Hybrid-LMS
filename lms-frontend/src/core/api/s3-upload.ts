import { post } from './http';

/** What an uploaded file is for; the backend applies different rules and keys to each. */
export type UploadPurpose =
  | 'DOCUMENT'
  | 'ASSIGNMENT'
  | 'SUBMISSION'
  | 'EXAM'
  | 'EXAM_SUBMISSION';

export interface S3UploadOptions {
  purpose: UploadPurpose;
  contentType: string;
  /** Required for SUBMISSION: the assignment being handed in to. */
  assignmentId?: string;
}

interface UploadRequest {
  fileId: string;
  upload: { url: string; fields: Record<string, string> };
}

/**
 * Sends the file straight to S3. It deliberately does not use the app's HTTP client: S3 authorises the
 * request through the signed fields, and the app's JWT must never be sent to a third party.
 */
const postToS3 = async (
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

/**
 * Runs the S3 upload flow for one file: ask the backend for permission, upload straight to S3, then confirm.
 * Resolves with the id of the confirmed (READY) file, ready to be attached to course content.
 */
export const uploadFileToS3 = async (
  file: File,
  { purpose, contentType, assignmentId }: S3UploadOptions,
): Promise<string> => {
  const { fileId, upload } = await post<UploadRequest>(
    '/api/files/upload-requests',
    {
      purpose,
      fileName: file.name,
      contentType,
      size: file.size,
      ...(assignmentId ? { assignmentId } : {}),
    },
  );
  await postToS3(upload, file);
  await post(`/api/files/${fileId}/confirm`);
  return fileId;
};