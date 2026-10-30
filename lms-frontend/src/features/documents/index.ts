// Public API of the "documents" feature. Import from "@features/documents" outside this folder.
export { useDocument } from './hooks/useDocument';
export { useDocuments } from './hooks/useDocuments';
export { useUploadDocument } from './hooks/useUploadDocument';
export { documentKeys } from './api/queryKeys';
export { DOCUMENT_ACCEPT, validateDocumentFile } from './utils/upload-rules';
export type { LmsDocument, LmsDocumentSummary } from './types/documents.types';
