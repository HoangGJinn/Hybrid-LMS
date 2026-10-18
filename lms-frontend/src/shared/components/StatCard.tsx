import type { ReactNode } from 'react';

export const StatCard = ({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) => (
  <div className="rounded-xl border border-l-4 border-l-primary bg-card p-4 shadow-sm">
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      {label}
      {icon}
    </div>
    <p className="m-0 mt-2 text-2xl font-bold">{value}</p>
    {hint && <p className="m-0 mt-1 text-xs text-muted-foreground">{hint}</p>}
  </div>
);
