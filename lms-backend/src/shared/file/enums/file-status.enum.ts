/** Lifecycle of an uploaded file: only READY files may be attached to course content or downloaded. */
export enum FileStatus {
  PENDING = 'PENDING',
  READY = 'READY',
}
