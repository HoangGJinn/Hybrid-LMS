/** What an uploaded file is for; each purpose has its own upload rules and S3 key prefix. */
export enum FilePurpose {
  DOCUMENT = 'DOCUMENT',
  ASSIGNMENT = 'ASSIGNMENT',
  SUBMISSION = 'SUBMISSION',
  EXAM = 'EXAM',
  EXAM_SUBMISSION = 'EXAM_SUBMISSION',
}
