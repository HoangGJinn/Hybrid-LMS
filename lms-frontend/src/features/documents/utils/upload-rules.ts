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

/**
 * Browsers often report an empty type for these files (Windows without Office reports '' for .pptx),
 * so the extension decides in that case.
 */
const CONTENT_TYPE_BY_EXTENSION: Readonly<Record<string, string>> = {
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  mp4: 'video/mp4',
};

/**
 * Code and text files, accepted for assignments only (not for course documents).
 * The extension always decides their type, because browsers report '' or different types for them,
 * and the backend compares the type declared at upload with the one S3 stored: they must be identical.
 * Keep in sync with CODE_CONTENT_TYPES in the backend's upload-rules.constant.ts.
 */
const CODE_TYPE_BY_EXTENSION: Readonly<Record<string, string>> = {
  py: 'text/x-python',
  c: 'text/x-csrc',
  cpp: 'text/x-c++src',
  cc: 'text/x-c++src',
  cxx: 'text/x-c++src',
  h: 'text/x-chdr',
  hpp: 'text/x-chdr',
  java: 'text/x-java-source',
  js: 'text/javascript',
  css: 'text/css',
  txt: 'text/plain',
};

/** File types a lecturer can pick as "accepted" for an assignment. Same list as the backend's SUBMISSION_FORMATS. */
export const SUBMISSION_FORMATS = [
  'py',
  'c',
  'cpp',
  'h',
  'java',
  'js',
  'css',
  'txt',
  'zip',
  'rar',
  '7z',
  'pdf',
  'docx',
  'pptx',
  'xlsx',
] as const;

/** Extensions that count as the same format, so one choice covers both (`.ppt` is accepted as `pptx`). */
const EXTENSION_ALIASES: Readonly<Record<string, string>> = {
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'h',
  doc: 'docx',
  ppt: 'pptx',
  xls: 'xlsx',
};

/** Lower-case extension of a file name without the dot; '' when the name has none. */
const rawExtension = (fileName: string): string => {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex < 0 ? '' : fileName.slice(dotIndex + 1).toLowerCase();
};

/** Format of a file name with aliases folded: `a.PPT` → `pptx`, `main.cc` → `cpp`. */
export const getExtension = (fileName: string): string => {
  const extension = rawExtension(fileName);
  return EXTENSION_ALIASES[extension] ?? extension;
};

/** Every extension that stands for the given format, e.g. `pptx` → `['pptx', 'ppt']`. */
export const extensionsOfFormat = (format: string): string[] => [
  format,
  ...Object.entries(EXTENSION_ALIASES)
    .filter(([, target]) => target === format)
    .map(([alias]) => alias),
];

/** The content type sent to the backend and signed into the S3 upload. */
export const resolveContentType = (file: File): string => {
  const extension = rawExtension(file.name);
  const codeType = CODE_TYPE_BY_EXTENSION[extension];
  if (codeType) return codeType;
  if (file.type) return file.type;
  return CONTENT_TYPE_BY_EXTENSION[extension] ?? '';
};

/** Value for `<input accept>`; the extensions let the file picker show archives whose type is unknown. */
export const DOCUMENT_ACCEPT = [
  ...DOCUMENT_CONTENT_TYPES,
  '.zip',
  '.rar',
  '.7z',
].join(',');

/** Value for `<input accept>` of assignment attachments: documents plus code and text files. */
export const ASSIGNMENT_ACCEPT = [
  DOCUMENT_ACCEPT,
  ...Object.keys(CODE_TYPE_BY_EXTENSION).map((extension) => `.${extension}`),
].join(',');

/** `<input accept>` for the formats a lecturer allowed; `undefined` (any supported file) when none were chosen. */
export const acceptForFormats = (
  formats: readonly string[],
): string | undefined =>
  formats.length === 0
    ? undefined
    : formats
        .flatMap((format) => extensionsOfFormat(format))
        .map((extension) => `.${extension}`)
        .join(',');

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

/**
 * Like validateDocumentFile, for assignment files (documents, archives and code).
 * `accepted` is the list of formats the lecturer allowed; empty means any supported format.
 */
export const validateAssignmentFile = (
  file: File,
  accepted: readonly string[] = [],
): string | null => {
  const type = resolveContentType(file);
  const isSupported =
    (DOCUMENT_CONTENT_TYPES as readonly string[]).includes(type) ||
    Object.values(CODE_TYPE_BY_EXTENSION).includes(type);
  if (!isSupported) return 'This file format is not supported';
  if (accepted.length > 0 && !accepted.includes(getExtension(file.name))) {
    return `Only ${accepted.map((format) => `.${format}`).join(', ')} files are accepted`;
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