import { UserMinus } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { formatDate } from '@shared/utils/format';
import { cn } from '@shared/utils/cn';
import type { ParticipantView } from '../types/participant-management.types';

interface ParticipantTableProps {
  participants: ParticipantView[];
  /** When given, each row gets a "remove from class" button; the page opens the confirmation. */
  onRemove?: (participant: ParticipantView) => void;
}

const formatStatus = (status: string) =>
  status.charAt(0) + status.slice(1).toLowerCase();

export const ParticipantTable = ({
  participants,
  onRemove,
}: ParticipantTableProps) => (
  <div className="overflow-x-auto rounded-lg border bg-card">
    <table className="w-full text-sm">
      <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
        <tr>
          <th className="p-3">Code</th>
          <th className="p-3">Full name</th>
          <th className="p-3">Email</th>
          <th className="p-3">Status</th>
          <th className="p-3">Joined</th>
          {onRemove && <th className="p-3" />}
        </tr>
      </thead>
      <tbody>
        {participants.map((p) => (
          <tr key={p.studentId} className="border-b last:border-0">
            <td className="p-3 font-semibold">{p.studentCode}</td>
            <td className="p-3">
              <span className="flex items-center gap-2">
                {p.fullName}
                {!p.isActive && (
                  <span className="inline-flex rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                    Deactivated
                  </span>
                )}
              </span>
            </td>
            <td className="p-3 text-muted-foreground">{p.email}</td>
            <td className="p-3">
              <span
                className={cn(
                  'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                  p.status === 'STUDYING'
                    ? 'bg-success/15 text-success'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {formatStatus(p.status)}
              </span>
            </td>
            <td className="p-3">{formatDate(p.joinedAt)}</td>
            {onRemove && (
              <td className="p-3 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${p.fullName}`}
                  title="Remove from class"
                  onClick={() => onRemove(p)}
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
