import { Role } from '../../../common/enums/role.enum.js';
import { FilePurpose } from '../enums/file-purpose.enum.js';

const BYTES_PER_MEGABYTE = 1024 * 1024;
const DOCUMENT_MAX_SIZE_MEGABYTES = 100;

export interface UploadRule {
  /** Roles allowed to request an upload for this purpose. */
  readonly allowedRoles: readonly Role[];
  readonly maxSizeBytes: number;
  /** Allowed content types and the extension used in the S3 key; the extension never comes from the file name. */
  readonly extensionByContentType: Readonly<Record<string, string>>;
  /** Folder prefix of the S3 key, followed by `/{ownerId}/{fileId}.{extension}`. */
  readonly keyPrefix: string;
}

export const UPLOAD_RULES: Readonly<Record<FilePurpose, UploadRule>> = {
  [FilePurpose.DOCUMENT]: {
    allowedRoles: [Role.LECTURER],
    maxSizeBytes: DOCUMENT_MAX_SIZE_MEGABYTES * BYTES_PER_MEGABYTE,
    keyPrefix: 'documents',
    extensionByContentType: {
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        'docx',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        'pptx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        'xlsx',
      'video/mp4': 'mp4',
      'application/zip': 'zip',
    },
  },
};
