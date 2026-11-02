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
  'application/x-zip-compressed',
  'application/vnd.rar',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
] as const;

/** Browsers often report an empty type for archives, so the extension decides in that case. */
const CONTENT_TYPE_BY_EXTENSION: Readonly<Record<string, string>> = {
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
};

/** The content type sent to the backend and signed into the S3 upload. */
export const resolveContentType = (file: File): string => {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return CONTENT_TYPE_BY_EXTENSION[extension] ?? '';
};

/** Value for `<input accept>`; the extensions let the file picker show archives whose type is unknown. */
export const DOCUMENT_ACCEPT = [
  ...DOCUMENT_CONTENT_TYPES,
  '.zip',
  '.rar',
  '.7z',
].join(',');

/** Returns an error message for an invalid file (UC-29 exception flow), or null when it can be uploaded. */
export const validateDocumentFile = (file: File): string | null => {
  if (
    !(DOCUMENT_CONTENT_TYPES as readonly string[]).includes(
      resolveContentType(file),
    )
  ) {
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