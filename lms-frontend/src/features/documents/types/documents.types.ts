/** A document as shown in a list. It carries no file link, so a cached list can never hold an expired URL. */
export interface LmsDocumentSummary {
  id: string;
  title: string;
  uploadedBy: string;
  fileName: string;
  isSeen: boolean;
}

/** One document with the short-lived presigned S3 URL its file is loaded from. */
export interface LmsDocument extends LmsDocumentSummary {
  fileUrl: string;
}
