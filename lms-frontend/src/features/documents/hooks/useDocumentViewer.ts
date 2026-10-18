import { combineQueries } from '@shared/utils/async-state';
import { useMyQuizzes } from '@features/quizzes';
import { useDocument } from './useDocument';

/** A document together with the quizzes the student can practise with. */
export const useDocumentViewer = (documentId: string) => {
  const document = useDocument(documentId);
  const quizzes = useMyQuizzes();
  return combineQueries(
    [document, quizzes] as const,
    ([documentData, quizList]) => ({ doc: documentData, quizzes: quizList }),
  );
};
