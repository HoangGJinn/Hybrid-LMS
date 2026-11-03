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
    extensionByContentType: DOCUMENT_CONTENT_TYPES,
  },
  /** Files a student hands in. */
  [FilePurpose.SUBMISSION]: {
    allowedRoles: [Role.STUDENT],
    maxSizeBytes: MAX_SIZE_BYTES,
    keyPrefix: 'submissions',
    isScopedToAssignment: true,
    extensionByContentType: DOCUMENT_CONTENT_TYPES,
  },
};