import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { PracticePanel } from '@features/quizzes';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { toAsyncState } from '@shared/utils/async-state';
import { DocumentFileView } from '../components/DocumentFileView';
import { useDocument } from '../hooks/useDocument';
import { useMarkDocumentSeen } from '../hooks/useMarkDocumentSeen';

/** Student view of a document: the file, plus a practice panel that never blocks the file from showing. */
const DocumentViewerPage = () => {
  const { courseId = '', docId = '' } = useParams();
  const courseBase = `/student/courses/${courseId}`;
  const state = toAsyncState(useDocument(courseId, docId));
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
          action={<Link to={courseBase}>Back to course</Link>}
        />
      }
    >
      {(doc) => (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <DocumentFileView doc={doc} />
          <aside>
            <PracticePanel courseId={courseId} docId={docId} />
          </aside>
        </div>
      )}
    </AsyncView>
  );
};

export default DocumentViewerPage;