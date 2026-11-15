// Public API of the "documents" feature. Import from "@features/documents" outside this folder.
export { useDocument } from './hooks/useDocument';
export { useDocuments } from './hooks/useDocuments';
export { useUploadDocument } from './hooks/useUploadDocument';
export { documentKeys } from './api/queryKeys';
export {
  ASSIGNMENT_ACCEPT,
  DOCUMENT_ACCEPT,
  EXAM_ACCEPT,
  SUBMISSION_FORMATS,
  acceptForFormats,
  getExtension,
  resolveContentType,
  validateAssignmentFile,
  validateDocumentFile,
  validateExamFile,
} from './utils/upload-rules';
export type { LmsDocument, LmsDocumentSummary } from './types/documents.types';
export { useRemoveDocument } from './hooks/useRemoveDocument';