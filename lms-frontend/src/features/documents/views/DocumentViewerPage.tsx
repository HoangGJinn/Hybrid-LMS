import { lazy, Suspense, useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { Download, FileText, Sparkles } from 'lucide-react';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { PageHeader } from '@shared/components/PageHeader';
import { Skeleton } from '@shared/components/ui/skeleton';
import { StatusBadge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { toAsyncState } from '@shared/utils/async-state';
import { useDocumentViewer } from '../hooks/useDocumentViewer';
import { useMarkDocumentSeen } from '../hooks/useMarkDocumentSeen';

// pdf.js is large, so it is only fetched when a PDF is actually opened.
const PdfViewer = lazy(() => import('../components/PdfViewer'));

const isPdf = (fileName: string, fileUrl: string) =>
  /\.pdf($|\?)/i.test(fileName) || /\.pdf($|\?)/i.test(fileUrl);

const DocumentViewerPage = () => {
  const { courseId = '', docId = '' } = useParams();
  const state = toAsyncState(useDocumentViewer(docId));
  const { mutate: markSeen } = useMarkDocumentSeen();

  useEffect(() => {
    if (docId) markSeen(docId);
  }, [docId, markSeen]);

  return (
    <AsyncView
      state={state}
      empty={
        <EmptyState
          title="Document not found"
          action={
            <Link to={`/student/courses/${courseId}`}>Back to course</Link>
          }
        />
      }
    >
      {({ doc, quizzes }) => (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
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
              {doc.fileUrl &&
              doc.fileUrl !== '#' &&
              isPdf(doc.fileName, doc.fileUrl) ? (
                <Suspense fallback={<Skeleton className="m-4 h-full" />}>
                  <PdfViewer url={doc.fileUrl} title={doc.title} />
                </Suspense>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3">
                  <FileText className="h-12 w-12" />
                  <p className="m-0 text-sm">
                    Preview is not available for this file.
                  </p>
                </div>
              )}
            </div>
          </div>
          <aside className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-brand" />
                Practice
              </div>
              <p className="mt-0 text-sm text-muted-foreground">
                Check your understanding with an adaptive quiz.
              </p>
              {quizzes.length === 0 ? (
                <p className="m-0 text-sm text-muted-foreground">
                  No quizzes available yet.
                </p>
              ) : (
                <ul className="m-0 list-none space-y-2 p-0">
                  {quizzes.map((q) => (
                    <li key={q.id}>
                      <Link
                        to={`/student/courses/${courseId}/quizzes/${q.id}`}
                        className="flex items-center justify-between rounded-md border p-2 text-sm text-foreground no-underline hover:border-primary"
                      >
                        <span>{q.title}</span>
                        <StatusBadge status={q.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}
    </AsyncView>
  );
};

export default DocumentViewerPage;
