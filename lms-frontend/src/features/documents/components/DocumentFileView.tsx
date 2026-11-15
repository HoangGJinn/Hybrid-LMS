import { Download } from 'lucide-react';
import { FilePreviewPanel } from '@shared/components/file-preview';
import { PageHeader } from '@shared/components/PageHeader';
import { Button } from '@shared/components/ui/button';
import type { LmsDocument } from '../types/documents.types';

/** Header, download button and file preview of one document. Shared by the student and lecturer pages. */
export const DocumentFileView = ({ doc }: { doc: LmsDocument }) => {
  const files =
    doc.fileUrl && doc.fileUrl !== '#'
      ? [{ fileId: doc.id, fileName: doc.fileName, fileUrl: doc.fileUrl }]
      : [];

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title={doc.title}
        subtitle={doc.fileName}
        actions={
          <Button variant="outline" asChild>
            <a href={doc.fileUrl} download={doc.fileName}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </a>
          </Button>
        }
      />
      <FilePreviewPanel
        files={files}
        className="h-[75vh]"
        emptyMessage="Preview is not available for this file."
      />
    </div>
  );
};