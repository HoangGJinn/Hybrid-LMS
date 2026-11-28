import { Link } from 'react-router';
import { Sparkles } from 'lucide-react';
import { useMyQuizzes } from '../hooks/useMyQuizzes';
import { usePracticeInfo } from '../hooks/usePracticeInfo';
import { MasteryBar } from './MasteryBar';

const startButton =
  'flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground no-underline hover:opacity-90';

/** Practice card on a document page. A failure here never blocks the document itself. */
export const PracticePanel = ({
  courseId,
  docId,
}: {
  courseId: string;
  docId: string;
}) => {
  const info = usePracticeInfo(courseId, docId);
  const quizzes = useMyQuizzes();
  const recent =
    info.data && quizzes.data
      ? quizzes.data.filter((q) => q.subjectId === info.data.subjectId).slice(0, 3)
      : [];

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 font-semibold">
        <Sparkles className="h-4 w-4 text-brand" />
        Practice quiz
      </div>

      {info.isPending ? (
        <p className="m-0 text-sm text-muted-foreground">Loading…</p>
      ) : info.isError ? (
        <p className="m-0 text-sm text-muted-foreground">
          Practice is unavailable right now.
        </p>
      ) : info.data.kcs.length === 0 ? (
        <>
          <p className="m-0 text-sm text-muted-foreground">
            Topics for this document are not ready yet, so the questions will
            come from the whole subject.
          </p>
          <Link
            to={`/student/courses/${courseId}/documents/${docId}/practice`}
            className={startButton}
          >
            Start practice
          </Link>
          <p className="m-0 text-center text-xs text-muted-foreground">
            Not graded
          </p>
        </>
      ) : (
        <>
          <p className="m-0 text-sm text-muted-foreground">
            Questions come from this document&apos;s topics, picked to match what
            you still need to work on.
          </p>
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Topics in this document
            </div>
            {info.data.kcs.map((kc) => (
              <MasteryBar
                key={kc.kcId}
                label={kc.name}
                value={kc.mastery}
                level={kc.level}
                confidence={kc.confidence}
              />
            ))}
          </div>
          <Link
            to={`/student/courses/${courseId}/documents/${docId}/practice`}
            className={startButton}
          >
            Start practice
          </Link>
          <p className="m-0 text-center text-xs text-muted-foreground">
            Not graded
          </p>
        </>
      )}

      {recent.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recent
          </div>
          <ul className="m-0 list-none space-y-2 p-0">
            {recent.map((q) => (
              <li key={q.id}>
                <Link
                  to={`/student/courses/${courseId}/quizzes/${q.id}`}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm text-foreground no-underline hover:border-primary"
                >
                  <span className="truncate">{q.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {q.status === 'SUBMITTED' && q.correctCount !== null
                      ? `${q.correctCount}/${q.numQuestions}`
                      : 'In progress'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};