import { cn } from '@shared/utils/cn';
import type { ImportBatchStatus } from '../types/question-bank.types';

const LABEL: Record<ImportBatchStatus, string> = {
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  PARTIAL: 'Partial',
  FAILED: 'Failed',
};

const STYLE: Record<ImportBatchStatus, string> = {
  PROCESSING: 'bg-muted text-muted-foreground',
  COMPLETED: 'bg-success/15 text-success',
  PARTIAL: 'bg-amber-100 text-amber-900',
  FAILED: 'bg-destructive/10 text-destructive',
};

export const BatchStatusPill = ({ status }: { status: ImportBatchStatus }) => (
  <span
    className={cn(
      'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
      STYLE[status],
    )}
  >
    {LABEL[status]}
  </span>
);