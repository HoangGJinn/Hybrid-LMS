import { Role } from '../../../common/enums/role.enum.js';
import { FilePurpose } from '../enums/file-purpose.enum.js';

const BYTES_PER_MEGABYTE = 1024 * 1024;
const MAX_UPLOAD_SIZE_MEGABYTES = 100;

export interface UploadRule {
  /** Roles allowed to request an upload for this purpose. */
  readonly allowedRoles: readonly Role[];
  readonly maxSizeBytes: number;
  /** Allowed content types and the extension used in the S3 key; the extension never comes from the file name. */
  readonly extensionByContentType: Readonly<Record<string, string>>;
  /** Folder prefix of the S3 key, followed by `/{ownerId}/{fileId}.{extension}`. */
  readonly keyPrefix: string;
  /** When true the key also carries the assignment id: `{prefix}/{assignmentId}/{ownerId}/{fileId}.{extension}`. */
  readonly isScopedToAssignment: boolean;
}

const DOCUMENT_CONTENT_TYPES: Readonly<Record<string, string>> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'pptx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'video/mp4': 'mp4',
  'application/zip': 'zip',
  // Windows browsers often report .zip files with this type.
  'application/x-zip-compressed': 'zip',
  'application/vnd.rar': 'rar',
  'application/x-rar-compressed': 'rar',
  'application/x-7z-compressed': '7z',
};

/**
 * Code and text files for assignments. The content type is fixed per extension on the frontend,
 * because browsers report '' or different types for these files and S3 must see exactly the same type.
 */
const CODE_CONTENT_TYPES: Readonly<Record<string, string>> = {
  'text/x-python': 'py',
  'text/x-csrc': 'c',
  'text/x-c++src': 'cpp',
  'text/x-chdr': 'h',
  'text/x-java-source': 'java',
  'text/javascript': 'js',
  'text/css': 'css',
  'text/plain': 'txt',
};

/** What a lecturer's attachment or a student's submission may be: documents (incl. ppt/pptx), archives and code. */
const WORK_CONTENT_TYPES: Readonly<Record<string, string>> = {
  ...DOCUMENT_CONTENT_TYPES,
  ...CODE_CONTENT_TYPES,
};

/** File types a lecturer can pick as "accepted" when creating an assignment. */
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
  'docx', // also covers .doc
  'pptx', // also covers .ppt
  'xlsx', // also covers .xls
] as const;

/** Extensions that count as the same format, so one choice covers both. */
const EXTENSION_ALIASES: Readonly<Record<string, string>> = {
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'h',
  doc: 'docx',
  ppt: 'pptx',
  xls: 'xlsx',
};

/** Extension of a file name in lower case, with aliases folded (`a.PPT` → `pptx`). */
export const normalizeExtension = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_ALIASES[extension] ?? extension;
};

const MAX_SIZE_BYTES = MAX_UPLOAD_SIZE_MEGABYTES * BYTES_PER_MEGABYTE;

export const UPLOAD_RULES: Readonly<Record<FilePurpose, UploadRule>> = {
  [FilePurpose.DOCUMENT]: {
    allowedRoles: [Role.LECTURER],
    maxSizeBytes: MAX_SIZE_BYTES,
    keyPrefix: 'documents',
    isScopedToAssignment: false,
    extensionByContentType: DOCUMENT_CONTENT_TYPES,
  },
  /** Files the lecturer attaches to an assignment (the brief). */
  [FilePurpose.ASSIGNMENT]: {
    allowedRoles: [Role.LECTURER],
    maxSizeBytes: MAX_SIZE_BYTES,
    keyPrefix: 'assignments',
    isScopedToAssignment: false,
    extensionByContentType: WORK_CONTENT_TYPES,
  },
  /** Files a student hands in. */
  [FilePurpose.SUBMISSION]: {
    allowedRoles: [Role.STUDENT],
    maxSizeBytes: MAX_SIZE_BYTES,
    keyPrefix: 'submissions',
    isScopedToAssignment: true,
    extensionByContentType: WORK_CONTENT_TYPES,
  },
};