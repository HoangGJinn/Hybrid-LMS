/** Mirrors the backend upload rules for documents so invalid files are rejected before any request is sent. */
export const DOCUMENT_MAX_SIZE_BYTES = 100 * 1024 * 1024;

export const DOCUMENT_CONTENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4',
  'application/zip',
] as const;

/** Value for `<input accept>`. */
export const DOCUMENT_ACCEPT = DOCUMENT_CONTENT_TYPES.join(',');

/** Returns an error message for an invalid file (UC-29 exception flow), or null when it can be uploaded. */
export const validateDocumentFile = (file: File): string | null => {
  if (!(DOCUMENT_CONTENT_TYPES as readonly string[]).includes(file.type)) {
    return 'This file format is not supported';
  }
  if (file.size === 0) return 'This file is empty';
  if (file.size > DOCUMENT_MAX_SIZE_BYTES) {
    return 'This file is too large (maximum 100 MB)';
  }
  return null;
};

/** Default document title: the file name without its extension. */
export const titleFromFileName = (fileName: string): string => {
  const dotIndex = fileName.lastIndexOf('.');
  const title = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  return title.trim().slice(0, 255) || 'Untitled document';
};
