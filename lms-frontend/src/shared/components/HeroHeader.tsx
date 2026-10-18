import type { ReactNode } from 'react';

export const HeroHeader = ({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) => (
  <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-primary via-sky-200 to-sky-100 p-6 text-primary-foreground shadow-sm">
    <div>
      <h1 className="m-0 text-2xl font-bold">{title}</h1>
      {subtitle && <p className="m-0 mt-1 text-sm opacity-80">{subtitle}</p>}
    </div>
    {actions}
  </section>
);
