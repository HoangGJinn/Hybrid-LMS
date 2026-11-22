import { Link, useParams } from 'react-router';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { toAsyncState } from '@shared/utils/async-state';
import { DocumentFileView } from '../components/DocumentFileView';
import { useDocument } from '../hooks/useDocument';

/** Lecturer view of a document of one of their classes: just the file, no student practice panel. */
const LecturerDocumentPage = () => {
  const { courseId = '', docId = '' } = useParams();
  const state = toAsyncState(useDocument(courseId, docId));

  return (
    <AsyncView
      state={state}
      empty={
        <EmptyState
          title="Document not found"
          action={
            <Link to={`/lecturer/classes/${courseId}`}>Back to course</Link>
          }
        />
      }
    >
      {(doc) => <DocumentFileView doc={doc} />}
    </AsyncView>
  );
};

export default LecturerDocumentPage;