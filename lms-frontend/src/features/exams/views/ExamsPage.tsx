import { formatDateTime } from '@shared/utils/format';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { PageHeader } from '@shared/components/PageHeader';
import { StatusBadge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { toAsyncState } from '@shared/utils/async-state';
import { useUpcomingExams } from '../hooks/useExams';
import { Link } from 'react-router';
import { Clock, Trophy } from 'lucide-react';

const ExamsPage = () => {
  const state = toAsyncState(useUpcomingExams());
  return (
    <div>
      <PageHeader title="Exams" />
      <AsyncView
        state={state}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState title="No exams scheduled" />}
      >
        {(exams) => (
          <ul className="m-0 list-none space-y-3 p-0">
            {[...exams]
              .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime))
              .map((e) => {
                const attemptsText =
                  e.maxAttempts === null
                    ? `${e.attemptsUsed} / ∞ attempts`
                    : `${e.attemptsUsed} / ${e.maxAttempts} attempts`;
                return (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4"
                  >
                    <div className="flex-1">
                      <p className="m-0 font-semibold">{e.examName}</p>
                      <p className="m-0 mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDateTime(e.startTime)} · {e.durationMinutes}{' '}
                          mins
                        </span>
                        <span>· {attemptsText}</span>
                        {e.showResults && e.bestScore !== null && (
                          <span className="inline-flex items-center gap-1 font-medium text-foreground">
                            · <Trophy className="h-3.5 w-3.5 text-warning" />
                            Best: {e.bestScore.toFixed(2)}/10
                          </span>
                        )}
                      </p>
                    </div>
                    <StatusBadge status={e.status} />
                    <Button
                      asChild
                      variant={
                        e.inProgressSessionId || e.status === 'OPEN'
                          ? 'default'
                          : 'outline'
                      }
                    >
                      <Link to={`/student/courses/${e.classId}/exams/${e.id}`}>
                        {e.inProgressSessionId
                          ? 'Continue Attempt'
                          : e.attemptsUsed > 0
                            ? 'View / Retake'
                            : 'Enter Exam Room'}
                      </Link>
                    </Button>
                  </li>
                );
              })}
          </ul>
        )}
      </AsyncView>
    </div>
  );
};

export default ExamsPage;
