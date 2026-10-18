import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState = ({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-card p-10 text-center">
    <Inbox className="h-8 w-8 text-muted-foreground" />
    <p className="m-0 font-medium">{title}</p>
    {description && (
      <p className="m-0 text-sm text-muted-foreground">{description}</p>
    )}
    {action}
  </div>
);
