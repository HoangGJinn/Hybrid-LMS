import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

/** Flat bordered surface shared by every dashboard block. */
export const Panel = ({
  title,
  aside,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) => (
  <section className={cn('flex min-w-0 flex-col rounded-md border bg-card', className)}>
    <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
      <h2 className="m-0 text-sm font-semibold">{title}</h2>
      {aside}
    </header>
    <div className={cn('flex flex-1 flex-col p-4', bodyClassName)}>
      {children}
    </div>
  </section>
);

/** Small segmented control used for filters and range pickers. */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-md border bg-muted/50 p-0.5"
    >
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-sm px-2.5 py-1 text-xs font-medium transition-colors',
            value === option.value
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
