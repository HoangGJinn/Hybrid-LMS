import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { Sparkles } from 'lucide-react';
import { useMyQuizzes } from '@features/quizzes';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { StatusBadge } from '@shared/components/ui/badge';
import { toAsyncState } from '@shared/utils/async-state';
import { DocumentFileView } from '../components/DocumentFileView';
import { useDocument } from '../hooks/useDocument';
import { useMarkDocumentSeen } from '../hooks/useMarkDocumentSeen';

/** Student view of a document: the file, plus a practice panel that never blocks the file from showing. */
const DocumentViewerPage = () => {
  const { courseId = '', docId = '' } = useParams();
  const state = toAsyncState(useDocument(courseId, docId));
  // Practice quizzes are secondary: if they fail to load, the document must still open.
  const quizzes = useMyQuizzes();
  const { mutate: markSeen } = useMarkDocumentSeen();

  useEffect(() => {
    if (courseId && docId) markSeen({ classId: courseId, documentId: docId });
  }, [courseId, docId, markSeen]);

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
      {(doc) => (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <DocumentFileView doc={doc} />
          <aside className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-brand" />
                Practice
              </div>
              <p className="mt-0 text-sm text-muted-foreground">
                Check your understanding with an adaptive quiz.
              </p>
              {quizzes.isPending ? (
                <p className="m-0 text-sm text-muted-foreground">
                  Loading quizzes…
                </p>
              ) : quizzes.isError ? (
                <p className="m-0 text-sm text-muted-foreground">
                  Quizzes are unavailable right now.
                </p>
              ) : quizzes.data.length === 0 ? (
                <p className="m-0 text-sm text-muted-foreground">
                  No quizzes available yet.
                </p>
              ) : (
                <ul className="m-0 list-none space-y-2 p-0">
                  {quizzes.data.map((q) => (
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