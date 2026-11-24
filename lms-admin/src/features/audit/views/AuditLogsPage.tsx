import { useEffect, useState, type KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Download, RefreshCw, RotateCcw, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/core/api/errors';
import { AsyncView } from '@/shared/components/AsyncView';
import { EmptyState } from '@/shared/components/EmptyState';
import { Pagination } from '@/shared/components/Pagination';
import { Button } from '@/shared/components/ui/Button';
import { Segmented } from '@/shared/components/ui/Segmented';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { cn } from '@/shared/utils/cn';
import { formatDateTime, formatRelativeTime } from '@/shared/utils/date';
import { AuditDetailModal } from '../components/AuditDetailModal';
import { useAuditLogs, useExportAuditLogs } from '../hooks/useAuditLogs';
import type {
  AuditAction,
  AuditCategory,
  AuditEntityType,
  AuditLogItem,
  AuditResult,
  DatePreset,
} from '../types/audit.types';
import {
  ACTION_META,
  CATEGORY_LABELS,
  ENTITY_TYPE_LABELS,
  getActionDotTone,
  getActionMeta,
  getActionsForCategory,
  getDatePresetRange,
  getTargetLink,
} from '../utils/audit-display';

type CategoryScope = 'ALL' | AuditCategory;
type ResultScope = 'ALL' | AuditResult;

const SEARCH_DEBOUNCE_MS = 300;

const PAGE_SIZE_OPTIONS = [
  { value: '20', label: '20 / page' },
  { value: '50', label: '50 / page' },
  { value: '100', label: '100 / page' },
] as const;

const CATEGORY_TABS: { value: CategoryScope; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SECURITY', label: 'Security' },
];

const RESULT_TABS: { value: ResultScope; label: string }[] = [
  { value: 'ALL', label: 'All outcomes' },
  { value: 'FAILURE', label: 'Failed' },
  { value: 'SUCCESS', label: 'Succeeded' },
];

const DATE_TABS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'custom', label: 'Custom' },
];

const ENTITY_OPTIONS = (
  Object.entries(ENTITY_TYPE_LABELS) as [AuditEntityType, string][]
).map(([value, label]) => ({ value, label }));

const formatClock = (timestamp: number): string =>
  timestamp
    ? new Date(timestamp).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '';

const shortenId = (id: string): string =>
  id.length > 12 ? `${id.slice(0, 8)}…` : id;

const SELECT_CLASS =
  'h-8 cursor-pointer rounded-[4px] border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const DATE_INPUT_CLASS =
  'h-8 rounded-[4px] border border-input bg-background px-2.5 text-xs tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const AuditLogsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const urlSearch = searchParams.get('search') ?? '';
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearch);
  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    setSearchInput(urlSearch);
  }
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    if (trimmed === urlSearch) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (trimmed) next.set('search', trimmed);
        else next.delete('search');
        next.delete('page');
        return next;
      },
      { replace: true },
    );
  }, [debouncedSearch, urlSearch, setSearchParams]);

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const limit = [20, 50, 100].includes(Number(searchParams.get('limit')))
    ? Number(searchParams.get('limit'))
    : 20;
  const category = (searchParams.get('category') as AuditCategory) || undefined;
  const action = (searchParams.get('action') as AuditAction) || undefined;
  const entityType =
    (searchParams.get('entityType') as AuditEntityType) || undefined;
  const result = (searchParams.get('result') as AuditResult) || undefined;
  const entityId = searchParams.get('entityId') || undefined;
  const parentId = searchParams.get('parentId') || undefined;
  const relatedId = searchParams.get('relatedId') || undefined;
  const actorId = searchParams.get('actorId') || undefined;
  const requestId = searchParams.get('requestId') || undefined;
  const contextLabel = searchParams.get('contextLabel') || undefined;
  const actorLabel = searchParams.get('actorLabel') || undefined;

  const rawPreset = searchParams.get('range') as DatePreset | null;
  const datePreset: DatePreset =
    rawPreset === 'today' ||
    rawPreset === '7d' ||
    rawPreset === '30d' ||
    rawPreset === 'custom'
      ? rawPreset
      : 'all';
  const customFrom = searchParams.get('from') || undefined;
  const customTo = searchParams.get('to') || undefined;

  const dateRange =
    datePreset === 'custom'
      ? { from: customFrom, to: customTo }
      : getDatePresetRange(datePreset);

  const queryParams = {
    page,
    limit,
    category,
    action,
    entityType,
    entityId,
    parentId,
    relatedId,
    actorId,
    requestId,
    result,
    from: dateRange.from,
    to: dateRange.to,
    search: urlSearch || undefined,
  };

  const logs = useAuditLogs(queryParams);
  const exportMutation = useExportAuditLogs();

  const updateParams = (updates: Record<string, string | undefined>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      if (!('page' in updates)) next.delete('page');
      return next;
    });
  };

  const clearAllFilters = () => {
    setSearchInput('');
    setSearchParams((prev) => {
      const preservedLimit = prev.get('limit');
      const next = new URLSearchParams();
      if (preservedLimit) next.set('limit', preservedLimit);
      return next;
    });
  };

  const hasFilters = Boolean(
    urlSearch ||
      category ||
      action ||
      entityType ||
      result ||
      entityId ||
      parentId ||
      relatedId ||
      actorId ||
      requestId ||
      datePreset !== 'all',
  );

  const handleExport = () => {
    const { page: _p, limit: _l, ...exportFilters } = queryParams;
    exportMutation.mutate(exportFilters, {
      onSuccess: () => toast.success('Audit logs exported to Excel.'),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  };

  const items = logs.data?.items ?? [];
  const totalCount = logs.data?.total;
  const clockLabel = formatClock(logs.dataUpdatedAt);

  const subtitleParts: string[] = [];
  if (typeof totalCount === 'number') {
    subtitleParts.push(
      `${totalCount.toLocaleString('en-US')} ${hasFilters ? 'matching ' : ''}${totalCount === 1 ? 'event' : 'events'}`,
    );
  }
  if (clockLabel) {
    subtitleParts.push(`Updated ${clockLabel}`);
  }
  const subtitle =
    subtitleParts.join(', ') ||
    'Administrative changes and authentication activity';

  // Resolve readable context chip labels from URL hints or loaded rows
  const resolvedCourseLabel =
    contextLabel ??
    items.find(
      (i) =>
        (relatedId && i.entityType === 'CLASS' && i.entityId === relatedId) ||
        (parentId && i.entityType === 'CLASS' && i.entityId === parentId),
    )?.entityLabel;
  const resolvedTargetLabel =
    contextLabel ??
    items.find((i) => entityId && i.entityId === entityId)?.entityLabel;
  const resolvedActorLabel =
    actorLabel ??
    items.find((i) => actorId && i.actorId === actorId)?.actorName ??
    items.find((i) => actorId && i.actorId === actorId)?.actorEmail;

  const hasContextChips = Boolean(
    relatedId || parentId || entityId || actorId || requestId,
  );

  const actionOptions = getActionsForCategory(category);

  const selectedIndex = selectedLog
    ? items.findIndex((item) => item.id === selectedLog.id)
    : -1;

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    item: AuditLogItem,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      const target = event.target as HTMLElement | null;
      if (target?.closest('a, button')) return;
      event.preventDefault();
      setSelectedLog(item);
    }
  };

  return (
    <>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div>
          <h1 className="m-0 text-xl font-semibold tracking-tight">
            Audit log
          </h1>
          <p className="m-0 mt-0.5 text-xs tabular-nums text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-[5px] shadow-none"
            disabled={logs.isFetching}
            onClick={() => void logs.refetch()}
          >
            <RefreshCw
              className={cn(
                'h-3.5 w-3.5',
                logs.isFetching && !logs.isLoading && 'animate-spin',
              )}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-[5px] shadow-none"
            disabled={totalCount === 0}
            isLoading={exportMutation.isPending}
            onClick={handleExport}
          >
            {!exportMutation.isPending && <Download className="h-3.5 w-3.5" />}
            Export Excel
          </Button>
        </div>
      </header>

      <section
        aria-label="Audit log filters"
        className="mb-4 space-y-2.5 rounded-[5px] border bg-card p-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label="Filter by category"
              value={category ?? 'ALL'}
              options={CATEGORY_TABS}
              onChange={(nextScope) => {
                const nextCategory =
                  nextScope === 'ALL' ? undefined : nextScope;
                const keepAction =
                  !nextCategory ||
                  !action ||
                  ACTION_META[action]?.category === nextCategory;
                updateParams({
                  category: nextCategory,
                  action: keepAction ? action : undefined,
                });
              }}
            />
            <Segmented
              label="Filter by outcome"
              value={result ?? 'ALL'}
              options={RESULT_TABS}
              onChange={(nextOutcome) =>
                updateParams({
                  result: nextOutcome === 'ALL' ? undefined : nextOutcome,
                })
              }
            />
          </div>

          <Segmented
            label="Filter by time range"
            value={datePreset}
            options={DATE_TABS}
            onChange={(preset) =>
              updateParams({
                range: preset === 'all' ? undefined : preset,
                from: preset === 'custom' ? customFrom : undefined,
                to: preset === 'custom' ? customTo : undefined,
              })
            }
          />
        </div>

        {datePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-2.5 text-xs">
            <span className="text-muted-foreground">Date range:</span>
            <input
              type="date"
              aria-label="From date"
              max={customTo}
              className={DATE_INPUT_CLASS}
              value={customFrom ?? ''}
              onChange={(e) => {
                const nextFrom = e.target.value || undefined;
                updateParams({
                  from: nextFrom,
                  to:
                    nextFrom && customTo && nextFrom > customTo
                      ? nextFrom
                      : customTo,
                });
              }}
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              aria-label="To date"
              min={customFrom}
              className={DATE_INPUT_CLASS}
              value={customTo ?? ''}
              onChange={(e) => {
                const nextTo = e.target.value || undefined;
                updateParams({
                  from:
                    nextTo && customFrom && nextTo < customFrom
                      ? nextTo
                      : customFrom,
                  to: nextTo,
                });
              }}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-60 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              aria-label="Search audit logs"
              placeholder="Search actor, target, summary, IP, or request ID..."
              className="h-8 w-full rounded-[4px] border border-input bg-background pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearchInput('');
                  if (urlSearch) updateParams({ search: undefined });
                }}
                className="absolute right-2 top-1/2 inline-flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-[3px] border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <select
            aria-label="Filter by target type"
            className={SELECT_CLASS}
            value={entityType ?? ''}
            onChange={(e) =>
              updateParams({ entityType: e.target.value || undefined })
            }
          >
            <option value="">All targets</option>
            {ENTITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by action"
            className={SELECT_CLASS}
            value={action ?? ''}
            onChange={(e) =>
              updateParams({ action: e.target.value || undefined })
            }
          >
            <option value="">All actions</option>
            {actionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Rows per page"
            className={cn(SELECT_CLASS, 'tabular-nums')}
            value={String(limit)}
            onChange={(e) =>
              updateParams({ limit: e.target.value, page: '1' })
            }
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-[4px] px-2.5 text-xs"
              onClick={clearAllFilters}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>

        {hasContextChips && (
          <div className="flex flex-wrap items-center gap-1.5 border-t pt-2 text-xs">
            <span className="text-muted-foreground">Scoped to:</span>
            {relatedId && (
              <span className="inline-flex items-center gap-1.5 rounded-[4px] border bg-muted/40 px-2 py-0.5 text-foreground">
                <span className="text-muted-foreground">Course:</span>
                <span className="font-medium">
                  {resolvedCourseLabel ?? shortenId(relatedId)}
                </span>
                <button
                  type="button"
                  aria-label="Remove course filter"
                  className="border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    updateParams({
                      relatedId: undefined,
                      contextLabel: undefined,
                    })
                  }
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {parentId && (
              <span className="inline-flex items-center gap-1.5 rounded-[4px] border bg-muted/40 px-2 py-0.5 text-foreground">
                <span className="text-muted-foreground">Course:</span>
                <span className="font-medium">
                  {resolvedCourseLabel ?? shortenId(parentId)}
                </span>
                <button
                  type="button"
                  aria-label="Remove parent course filter"
                  className="border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    updateParams({
                      parentId: undefined,
                      contextLabel: undefined,
                    })
                  }
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {entityId && (
              <span className="inline-flex items-center gap-1.5 rounded-[4px] border bg-muted/40 px-2 py-0.5 text-foreground">
                <span className="text-muted-foreground">Target:</span>
                <span className="font-medium">
                  {resolvedTargetLabel ?? shortenId(entityId)}
                </span>
                <button
                  type="button"
                  aria-label="Remove target filter"
                  className="border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    updateParams({
                      entityId: undefined,
                      contextLabel: undefined,
                    })
                  }
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {actorId && (
              <span className="inline-flex items-center gap-1.5 rounded-[4px] border bg-muted/40 px-2 py-0.5 text-foreground">
                <span className="text-muted-foreground">Actor:</span>
                <span className="font-medium">
                  {resolvedActorLabel ?? shortenId(actorId)}
                </span>
                <button
                  type="button"
                  aria-label="Remove actor filter"
                  className="border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    updateParams({ actorId: undefined, actorLabel: undefined })
                  }
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {requestId && (
              <span className="inline-flex items-center gap-1.5 rounded-[4px] border bg-muted/40 px-2 py-0.5 text-foreground">
                <span className="text-muted-foreground">Request:</span>
                <span className="font-mono">{shortenId(requestId)}</span>
                <button
                  type="button"
                  aria-label="Remove request filter"
                  className="border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => updateParams({ requestId: undefined })}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </section>

      <div
        aria-busy={logs.isFetching}
        className={logs.isPlaceholderData ? 'opacity-60 transition-opacity' : ''}
      >
        <AsyncView
          state={{
            data: logs.data,
            loading: logs.isLoading,
            error: logs.error,
            reload: () => void logs.refetch(),
          }}
          isEmpty={(res) => res.items.length === 0}
          empty={
            <EmptyState
              title="0 audit events found"
              description={
                hasFilters
                  ? 'Broaden your search or reset the active filters.'
                  : 'Administrative changes and sign-in events will appear here.'
              }
              action={
                hasFilters ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-[5px] shadow-none"
                    onClick={clearAllFilters}
                  >
                    Reset filters
                  </Button>
                ) : undefined
              }
            />
          }
        >
          {(res) => (
            <>
              <div className="w-full overflow-x-auto rounded-[5px] border bg-card">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-muted/35 text-xs font-medium text-muted-foreground">
                    <tr>
                      <th scope="col" className="whitespace-nowrap px-3.5 py-2.5">
                        Timestamp
                      </th>
                      <th scope="col" className="whitespace-nowrap px-3.5 py-2.5">
                        Event
                      </th>
                      <th scope="col" className="min-w-44 px-3.5 py-2.5">
                        Actor
                      </th>
                      <th scope="col" className="min-w-64 px-3.5 py-2.5">
                        Target & details
                      </th>
                      <th
                        scope="col"
                        className="whitespace-nowrap px-3.5 py-2.5 text-right"
                      >
                        Source IP
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {res.items.map((item) => {
                      const meta = getActionMeta(item.action);
                      const link = getTargetLink(item);
                      const targetText = item.entityLabel ?? item.entityId;
                      const changeCount = item.changes
                        ? Object.keys(item.changes).length
                        : 0;
                      const showSummaryLine = Boolean(
                        item.summary && item.summary !== targetText,
                      );

                      return (
                        <tr
                          key={item.id}
                          tabIndex={0}
                          onClick={(event) => {
                            const target = event.target as HTMLElement | null;
                            if (target?.closest('a, button')) return;
                            setSelectedLog(item);
                          }}
                          onKeyDown={(event) => handleRowKeyDown(event, item)}
                          className={cn(
                            'cursor-pointer transition-colors focus-visible:bg-muted/70 focus-visible:outline-none',
                            item.result === 'FAILURE'
                              ? 'bg-destructive/[0.025] hover:bg-destructive/[0.06]'
                              : 'hover:bg-muted/60',
                          )}
                        >
                          <td className="whitespace-nowrap px-3.5 py-2.5 align-top">
                            <span className="block font-mono text-xs tabular-nums text-foreground">
                              {formatDateTime(item.occurredAt)}
                            </span>
                            <span className="block text-[11px] tabular-nums text-muted-foreground">
                              {formatRelativeTime(item.occurredAt)}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-3.5 py-2.5 align-top">
                            <div className="flex items-center gap-2">
                              <span
                                aria-hidden="true"
                                className={cn(
                                  'h-2 w-2 shrink-0 rounded-full',
                                  getActionDotTone(item),
                                )}
                              />
                              <span className="text-[13px] font-medium text-foreground">
                                {meta.label}
                              </span>
                              {item.result === 'FAILURE' && (
                                <span className="inline-flex items-center rounded-[3px] border border-destructive/30 bg-destructive/10 px-1.5 py-0 text-[11px] font-medium text-destructive">
                                  Failed
                                </span>
                              )}
                            </div>
                            <span className="block pl-4 text-[11px] text-muted-foreground">
                              {CATEGORY_LABELS[item.category] ?? item.category}
                            </span>
                          </td>

                          <td className="px-3.5 py-2.5 align-top">
                            {item.actorName || item.actorEmail ? (
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="truncate text-[13px] font-medium text-foreground">
                                    {item.actorName ?? item.actorEmail}
                                  </span>
                                  {item.actorRole && (
                                    <span className="rounded-[3px] border bg-muted/40 px-1 py-0 font-mono text-[10px] text-muted-foreground">
                                      {item.actorRole}
                                    </span>
                                  )}
                                </div>
                                {item.actorEmail && item.actorName && (
                                  <p className="m-0 truncate text-xs text-muted-foreground">
                                    {item.actorEmail}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {item.category === 'SECURITY'
                                  ? 'Unauthenticated'
                                  : 'System'}
                              </span>
                            )}
                          </td>

                          <td className="max-w-md px-3.5 py-2.5 align-top">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">
                                {ENTITY_TYPE_LABELS[item.entityType] ??
                                  item.entityType}
                                {targetText ? ':' : ''}
                              </span>
                              {targetText &&
                                (link ? (
                                  <Link
                                    to={link}
                                    onClick={(e) => e.stopPropagation()}
                                    className="max-w-60 truncate text-[13px] font-medium text-brand no-underline hover:underline"
                                  >
                                    {targetText}
                                  </Link>
                                ) : (
                                  <span className="max-w-60 truncate text-[13px] font-medium text-foreground">
                                    {targetText}
                                  </span>
                                ))}
                              {changeCount > 0 && (
                                <span className="rounded-[3px] border bg-muted/40 px-1.5 py-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                                  {changeCount}{' '}
                                  {changeCount === 1 ? 'field' : 'fields'}
                                </span>
                              )}
                            </div>
                            {showSummaryLine && (
                              <p className="m-0 mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                {item.summary}
                              </p>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-3.5 py-2.5 text-right align-top">
                            {item.ipAddress && (
                              <span className="block font-mono text-xs tabular-nums text-muted-foreground">
                                {item.ipAddress}
                              </span>
                            )}
                            {item.requestId && (
                              <span
                                title={`Request ID: ${item.requestId}`}
                                className="block font-mono text-[10px] text-muted-foreground/75"
                              >
                                {shortenId(item.requestId)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={Math.min(page, res.totalPages)}
                pageSize={limit}
                total={res.total}
                onPageChange={(nextPage) =>
                  updateParams({ page: String(nextPage) })
                }
              />
            </>
          )}
        </AsyncView>
      </div>

      <AuditDetailModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
        hasPrev={selectedIndex > 0}
        hasNext={selectedIndex >= 0 && selectedIndex < items.length - 1}
        positionLabel={
          selectedIndex >= 0 && typeof totalCount === 'number'
            ? `${(page - 1) * limit + selectedIndex + 1} / ${totalCount}`
            : undefined
        }
        onNavigate={(direction) => {
          if (selectedIndex < 0) return;
          const nextIdx =
            direction === 'prev' ? selectedIndex - 1 : selectedIndex + 1;
          const candidate = items[nextIdx];
          if (candidate) setSelectedLog(candidate);
        }}
        onFilterByTarget={(log) => {
          if (log.entityId) {
            updateParams({
              entityType: log.entityType,
              entityId: log.entityId,
              contextLabel: log.entityLabel ?? undefined,
              parentId: undefined,
              relatedId: undefined,
            });
          } else if (log.parentId) {
            updateParams({
              parentId: log.parentId,
              contextLabel: log.entityLabel ?? undefined,
              entityId: undefined,
              relatedId: undefined,
            });
          }
        }}
        onFilterByActor={(nextActorId, nextActorLabel) =>
          updateParams({
            actorId: nextActorId,
            actorLabel: nextActorLabel ?? undefined,
          })
        }
        onFilterByRequest={(nextRequestId) =>
          updateParams({ requestId: nextRequestId })
        }
      />
    </>
  );
};

export default AuditLogsPage;
