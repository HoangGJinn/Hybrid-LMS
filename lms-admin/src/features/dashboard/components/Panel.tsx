import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

/** Dashboard block supporting either a bordered card surface or a flat page section. */
export const Panel = ({
  title,
  aside,
  children,
  variant = 'card',
  className,
  bodyClassName,
}: {
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  variant?: 'card' | 'flat';
  className?: string;
  bodyClassName?: string;
}) => {
  if (variant === 'flat') {
    return (
      <section className={cn('flex min-w-0 flex-col', className)}>
        <header className="flex min-h-[45px] flex-wrap items-center justify-between gap-2 border-b pb-2.5">
          <h2 className="m-0 text-sm font-semibold">{title}</h2>
          {aside}
        </header>
        <div className={cn('flex flex-1 flex-col pt-3', bodyClassName)}>
          {children}
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        'flex min-w-0 flex-col rounded-[5px] border bg-card',
        className,
      )}
    >
      <header className="flex min-h-[45px] flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <h2 className="m-0 text-sm font-semibold">{title}</h2>
        {aside}
      </header>
      <div className={cn('flex flex-1 flex-col p-4', bodyClassName)}>
        {children}
      </div>
    </section>
  );
};

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
      className="inline-flex rounded-[4px] border bg-muted/50 p-0.5"
    >
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-[3px] border-0 px-2 py-0.5 text-xs font-medium transition-colors',
            value === option.value
              ? 'bg-card text-foreground'
              : 'bg-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
