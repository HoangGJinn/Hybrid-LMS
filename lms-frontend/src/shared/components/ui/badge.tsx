import { cn } from '@shared/utils/cn';

const tone: Record<string, string> = {
  OPEN: 'bg-primary/25 text-brand',
  IN_PROGRESS: 'bg-primary/25 text-brand',
  UPCOMING: 'bg-muted text-muted-foreground',
  PENDING: 'bg-muted text-muted-foreground',
  CREATED: 'bg-muted text-muted-foreground',
  SUBMITTED: 'bg-accent text-accent-foreground',
  GRADED: 'bg-primary/30 text-brand',
  COMPLETED: 'bg-primary/30 text-brand',
  OVERDUE: 'bg-destructive/10 text-destructive',
};

export const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={cn(
      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
      tone[status] ?? 'bg-muted text-muted-foreground',
    )}
  >
    {status.replace('_', ' ')}
  </span>
);
