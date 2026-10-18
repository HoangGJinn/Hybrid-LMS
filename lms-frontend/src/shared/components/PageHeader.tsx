import type { ReactNode } from 'react';

export const PageHeader = ({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="m-0 text-2xl font-bold">{title}</h1>
      {subtitle && (
        <p className="m-0 mt-1 text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
    {actions}
  </div>
);
