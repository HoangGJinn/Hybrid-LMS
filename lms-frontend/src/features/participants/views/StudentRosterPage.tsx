import { useState } from 'react';
import { Search } from 'lucide-react';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { PageHeader } from '@shared/components/PageHeader';
import { Input } from '@shared/components/ui/input';
import { toAsyncState } from '@shared/utils/async-state';
import { cn } from '@shared/utils/cn';
import { ClassSelect, useClassSelection } from '@features/courses';
import { useRoster } from '../hooks/useRoster';
import { Bar } from '@shared/components/Bar';
import { masteryTone } from '@shared/utils/mastery-tone';

const StudentRosterPage = () => {
  const { classes, classId, setClassId } = useClassSelection();
  const [q, setQ] = useState('');
  const [riskOnly, setRiskOnly] = useState(false);
  const roster = toAsyncState(useRoster(classId));

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Roster, performance and at-risk learners"
        actions={
          classes.data && (
            <ClassSelect
              classes={classes.data}
              value={classId}
              onChange={setClassId}
            />
          )
        }
      />
      {/* TODO(mastery): scores, mastery, submissions and at-risk are placeholders until those modules are real. */}
      <p
        role="note"
        className="mb-4 rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground"
      >
        Performance data is not available yet. Average score, KC mastery, submissions and the
        “On track” status are placeholders. To add or remove students, use the Members tab.
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or code"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={riskOnly}
            onChange={(e) => setRiskOnly(e.target.checked)}
          />
          At-risk only
        </label>
      </div>
      <AsyncView
        state={roster}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState title="No students enrolled" />}
      >
        {(all) => {
          const term = q.trim().toLowerCase();
          const list = all.filter(
            (s) =>
              (!riskOnly || s.atRisk) &&
              (!term ||
                s.fullName.toLowerCase().includes(term) ||
                s.studentCode.includes(term)),
          );
          if (list.length === 0)
            return <EmptyState title="No students match" />;
          return (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3">Student</th>
                    <th className="p-3">Code</th>
                    <th className="p-3">Avg. score</th>
                    <th className="p-3 w-48">KC mastery</th>
                    <th className="p-3">Submissions</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="p-3">
                        <p className="m-0 font-medium">{s.fullName}</p>
                        <p className="m-0 text-xs text-muted-foreground">
                          {s.email}
                        </p>
                      </td>
                      <td className="p-3">{s.studentCode}</td>
                      <td className="p-3">{s.avgScore ?? '—'}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Bar
                            value={s.avgMastery * 100}
                            className={masteryTone(s.avgMastery)}
                          />
                          <span className="text-xs">
                            {Math.round(s.avgMastery * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        {s.submissionsDone}/{s.submissionsTotal}
                      </td>
                      <td className="p-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            s.atRisk
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-success/15 text-success',
                          )}
                        >
                          {s.atRisk ? 'At risk' : 'On track'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }}
      </AsyncView>
    </div>
  );
};

export default StudentRosterPage;
