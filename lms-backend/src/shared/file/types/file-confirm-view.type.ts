import type { FileStatus } from '../enums/file-status.enum.js';

/** Result of confirming an upload. */
export class FileConfirmView {
  constructor(
    readonly fileId: string,
    readonly status: FileStatus,
  ) {}
}
