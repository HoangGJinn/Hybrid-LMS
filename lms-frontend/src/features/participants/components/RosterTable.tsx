import { UserMinus } from 'lucide-react';
import { Bar } from '@shared/components/Bar';
import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/utils/cn';
import { masteryTone } from '@shared/utils/mastery-tone';
import type { RosterStudent } from '../types/participants.types';

interface RosterTableProps {
  students: RosterStudent[];
  /** When given, each row gets a "remove from class" button. */
  onRemove?: (student: RosterStudent) => void;
  /** Id of the student being removed right now. */
  pendingId?: string | null;
}

export const RosterTable = ({
  students,
  onRemove,
  pendingId = null,
}: RosterTableProps) => (
  <div className="overflow-x-auto rounded-lg border bg-card">
    <table className="w-full text-sm">
      <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
        <tr>
          <th className="p-3">Student</th>
          <th className="p-3">Code</th>
          <th className="p-3">Avg. score</th>
          <th className="w-48 p-3">KC mastery</th>
          <th className="p-3">Submissions</th>
          <th className="p-3">Status</th>
          {onRemove && <th className="p-3" />}
        </tr>
      </thead>
      <tbody>
        {students.map((s) => (
          <tr key={s.id} className="border-b last:border-0">
            <td className="p-3">
              <p className="m-0 font-medium">{s.fullName}</p>
              <p className="m-0 text-xs text-muted-foreground">{s.email}</p>
            </td>
            <td className="p-3">{s.studentCode}</td>
            <td className="p-3">{s.avgScore ?? '—'}</td>
            <td className="p-3">
              <div className="flex items-center gap-2">
                <Bar value={s.avgMastery * 100} className={masteryTone(s.avgMastery)} />
                <span className="text-xs">{Math.round(s.avgMastery * 100)}%</span>
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
            {onRemove && (
              <td className="p-3 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${s.fullName}`}
                  title="Remove from class"
                  disabled={pendingId === s.id}
                  onClick={() => onRemove(s)}
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);