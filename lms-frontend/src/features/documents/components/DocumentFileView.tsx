import { lazy, Suspense } from 'react';
import { Download, FileText } from 'lucide-react';
import { PageHeader } from '@shared/components/PageHeader';
import { Skeleton } from '@shared/components/ui/skeleton';
import { Button } from '@shared/components/ui/button';
import type { LmsDocument } from '../types/documents.types';

// pdf.js is large, so it is only fetched when a PDF is actually opened.
const PdfViewer = lazy(() => import('./PdfViewer'));

// The signed URL carries a long query string, so the file name decides the type.
const isPdf = (fileName: string) => /\.pdf$/i.test(fileName);

/** Header, download button and file preview of one document. Shared by the student and lecturer pages. */
export const DocumentFileView = ({ doc }: { doc: LmsDocument }) => (
  <div>
    <PageHeader
      title={doc.title}
      subtitle={doc.fileName}
      actions={
        <Button variant="outline" asChild>
          <a href={doc.fileUrl} download>
            <Download className="mr-2 h-4 w-4" />
            Download
          </a>
        </Button>
      }
    />
    <div className="flex h-[75vh] w-full flex-col overflow-hidden rounded-lg border bg-card text-muted-foreground">
      {doc.fileUrl && doc.fileUrl !== '#' && isPdf(doc.fileName) ? (
        <Suspense fallback={<Skeleton className="m-4 h-full" />}>
          <PdfViewer url={doc.fileUrl} title={doc.title} />
        </Suspense>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <FileText className="h-12 w-12" />
          <p className="m-0 text-sm">Preview is not available for this file.</p>
        </div>
      )}
    </div>
  </div>
);