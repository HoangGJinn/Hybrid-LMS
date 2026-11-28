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
  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
    <div>
      <h1 className="m-0 text-xl font-bold tracking-tight sm:text-2xl">
        {title}
      </h1>
      {subtitle && (
        <p className="m-0 mt-1 text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
    {actions}
  </div>
);
