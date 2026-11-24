import { Link } from 'react-router';
import { cn } from '@/shared/utils/cn';
import type { AdminDashboardOverview } from '../types/dashboard.types';
import { buildIssues, type Severity } from '../utils/attention';
import { Panel } from './Panel';

const DOT: Record<Severity, string> = {
  error: 'bg-destructive',
  warning: 'bg-warning',
  ok: 'bg-success',
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const AttentionPanel = ({
  overview,
}: {
  overview: AdminDashboardOverview;
}) => {
  const checks = buildIssues(overview);
  const issueCount = checks.filter((c) => c.severity !== 'ok').length;

  return (
    <Panel
      className="h-full"
      bodyClassName="overflow-y-auto"
      title="Needs attention"
      aside={
        <span
          className={cn(
            'text-xs tabular-nums',
            issueCount > 0 ? 'text-foreground' : 'text-success',
          )}
        >
          {issueCount > 0
            ? `${issueCount} ${plural(issueCount, 'item', 'items')}`
            : '0 issues'}
        </span>
      }
    >
      <ul className="m-0 -my-2 divide-y p-0">
        {checks.map((item) => (
          <li
            key={item.key}
            className="flex list-none flex-wrap items-center gap-x-2.5 gap-y-1.5 py-2.5"
          >
            <span
              aria-label={item.severity}
              className={cn('h-2 w-2 shrink-0 rounded-full', DOT[item.severity])}
            />
            <span
              className={cn(
                'min-w-0 flex-1 text-[13px]',
                item.severity === 'ok' && 'text-muted-foreground',
              )}
            >
              {item.text}
            </span>
            {item.links && item.links.length > 0 && (
              <span className="flex flex-wrap items-center gap-1">
                {item.links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="rounded-[4px] border px-1.5 py-0.5 font-mono text-xs text-foreground no-underline hover:border-brand hover:text-brand"
                  >
                    {link.label}
                  </Link>
                ))}
                {item.moreCount ? (
                  <span className="rounded-[4px] border bg-muted/50 px-1.5 py-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                    +{item.moreCount}
                  </span>
                ) : null}
              </span>
            )}
            {item.to && item.action && (
              <Link
                to={item.to}
                className="shrink-0 text-xs font-medium text-brand no-underline hover:underline"
              >
                {item.action}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
};
