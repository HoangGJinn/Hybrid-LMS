import * as React from 'react';
import { cn } from '@/shared/utils/cn';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  className?: string;
  emptyMessage?: string;
  rowClassName?: (item: T, index: number) => string | undefined;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  className,
  emptyMessage = 'No data',
  rowClassName,
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="w-full rounded-xl border border-dashed bg-card py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-full overflow-x-auto rounded-xl border bg-card shadow-sm',
        className,
      )}
    >
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-muted/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn('whitespace-nowrap px-4 py-3.5', col.className)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((item, index) => (
            <tr
              key={keyExtractor(item)}
              className={cn(
                'transition-colors hover:bg-accent/40',
                rowClassName?.(item, index),
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn('px-4 py-3.5 align-middle', col.className)}
                >
                  {col.render
                    ? col.render(item, index)
                    : ((item as Record<string, unknown>)[col.key] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
