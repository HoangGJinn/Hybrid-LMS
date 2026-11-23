import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  RotateCcw,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/core/api/errors';
import { AsyncView } from '@/shared/components/AsyncView';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { Pagination } from '@/shared/components/Pagination';
import { Table, type Column } from '@/shared/components/Table';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { formatDateTime, formatRelativeTime } from '@/shared/utils/date';
import { initials } from '@/shared/utils/initials';
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
  ENTITY_TYPE_LABELS,
  getActionMeta,
  getActionsForCategory,
  getDatePresetRange,
  getTargetLink,
} from '../utils/audit-display';

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE_OPTIONS = [
  { value: '20', label: '20 / page' },
  { value: '50', label: '50 / page' },
  { value: '100', label: '100 / page' },
];

const DATE_PRESET_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom range' },
];

const CATEGORY_OPTIONS: { value: AuditCategory; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SECURITY', label: 'Security' },
];

const ENTITY_OPTIONS = (
  Object.entries(ENTITY_TYPE_LABELS) as [AuditEntityType, string][]
).map(([value, label]) => ({ value, label }));

const RESULT_OPTIONS: { value: AuditResult; label: string }[] = [
  { value: 'SUCCESS', label: 'Success' },
  { value: 'FAILURE', label: 'Failure' },
];

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
    if (debouncedSearch === urlSearch) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (debouncedSearch.trim()) next.set('search', debouncedSearch.trim());
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
  const datePreset = (searchParams.get('range') as DatePreset) || 'all';
  const customFrom = searchParams.get('from') || undefined;
  const customTo = searchParams.get('to') || undefined;

  const dateRange =
    datePreset === 'custom'
      ? { from: customFrom, to: customTo }
      : getDatePresetRange(datePreset === 'today' || datePreset === '7d' || datePreset === '30d' ? datePreset : 'all');

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
    setSearchParams({});
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
      datePreset !== 'all',
  );

  const handleExport = () => {
    const { page: _p, limit: _l, ...exportFilters } = queryParams;
    exportMutation.mutate(exportFilters, {
      onSuccess: () => toast.success('Audit logs exported to Excel.'),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  };

  const columns: Column<AuditLogItem>[] = [
    {
      key: 'occurredAt',
      header: 'Time',
      className: 'whitespace-nowrap',
      render: (item) => (
        <span
          title={formatDateTime(item.occurredAt)}
          className="text-xs text-muted-foreground"
        >
          {formatRelativeTime(item.occurredAt)}
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      className: 'min-w-48',
      render: (item) =>
        item.actorName || item.actorEmail ? (
          <div className="flex items-center gap-2.5">
            <div
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary"
            >
              {initials(item.actorName ?? item.actorEmail ?? '?')}
            </div>
            <div className="min-w-0">
              <p className="m-0 truncate text-xs font-medium text-foreground">
                {item.actorName ?? item.actorEmail}
                {item.actorRole && (
                  <span className="ml-1.5 text-[10px] font-semibold uppercase text-muted-foreground">
                    · {item.actorRole}
                  </span>
                )}
              </p>
              {item.actorEmail && item.actorName && (
                <p className="m-0 truncate text-[11px] text-muted-foreground">
                  {item.actorEmail}
                </p>
              )}
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">System / Anonymous</span>
        ),
    },
    {
      key: 'action',
      header: 'Action',
      className: 'whitespace-nowrap',
      render: (item) => {
        const meta = getActionMeta(item.action);
        return <Badge variant={meta.variant}>{meta.label}</Badge>;
      },
    },
    {
      key: 'target',
      header: 'Target',
      className: 'min-w-40',
      render: (item) => {
        const link = getTargetLink(item);
        const label = item.entityLabel ?? item.entityId ?? '—';
        return (
          <div className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {ENTITY_TYPE_LABELS[item.entityType] ?? item.entityType}
            </span>
            {link ? (
              <Link
                to={link}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex max-w-52 items-center gap-1 truncate text-xs font-medium text-brand no-underline hover:underline"
              >
                <span className="truncate">{label}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </Link>
            ) : (
              <span className="block max-w-52 truncate text-xs text-foreground">
                {label}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'summary',
      header: 'Summary',
      className: 'min-w-56 max-w-md',
      render: (item) => (
        <span className="line-clamp-2 text-xs text-muted-foreground">
          {item.summary ?? '—'}
        </span>
      ),
    },
    {
      key: 'result',
      header: 'Result / IP',
      className: 'whitespace-nowrap text-right',
      render: (item) => (
        <div className="flex flex-col items-end gap-0.5">
          <span
            className={
              item.result === 'FAILURE'
                ? 'inline-flex items-center gap-1 text-xs font-medium text-destructive'
                : 'inline-flex items-center gap-1 text-xs font-medium text-success'
            }
          >
            {item.result === 'FAILURE' ? (
              <XCircle className="h-3.5 w-3.5" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {item.result === 'FAILURE' ? 'Failed' : 'Success'}
          </span>
          {item.ipAddress && (
            <span className="font-mono text-[11px] text-muted-foreground">
              {item.ipAddress}
            </span>
          )}
        </div>
      ),
    },
  ];

  const actionOptions = getActionsForCategory(category);

  return (
    <>
      <PageHeader
        title="Audit Log"
        subtitle="Track administrative changes and security events across the system."
        actions={
          <Button
            variant="outline"
            onClick={handleExport}
            isLoading={exportMutation.isPending}
          >
            {!exportMutation.isPending && <Download className="h-4 w-4" />}
            Export Excel
          </Button>
        }
      />

      <div className="mb-4 space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label="Search audit logs"
              placeholder="Search target, actor email or summary…"
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <Select
            aria-label="Filter by time range"
            value={datePreset}
            options={DATE_PRESET_OPTIONS}
            onChange={(e) => {
              const preset = e.target.value as DatePreset;
              updateParams({
                range: preset === 'all' ? undefined : preset,
                from: preset === 'custom' ? customFrom : undefined,
                to: preset === 'custom' ? customTo : undefined,
              });
            }}
          />

          <Select
            aria-label="Filter by category"
            placeholder="All categories"
            value={category ?? ''}
            options={CATEGORY_OPTIONS}
            onChange={(e) => {
              const nextCat = e.target.value || undefined;
              updateParams({
                category: nextCat,
                action: undefined,
              });
            }}
          />

          <Select
            aria-label="Filter by entity type"
            placeholder="All targets"
            value={entityType ?? ''}
            options={ENTITY_OPTIONS}
            onChange={(e) =>
              updateParams({ entityType: e.target.value || undefined })
            }
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full sm:w-56">
            <Select
              aria-label="Filter by action"
              placeholder="All actions"
              value={action ?? ''}
              options={actionOptions}
              onChange={(e) =>
                updateParams({ action: e.target.value || undefined })
              }
            />
          </div>

          <div className="w-full sm:w-40">
            <Select
              aria-label="Filter by result"
              placeholder="All results"
              value={result ?? ''}
              options={RESULT_OPTIONS}
              onChange={(e) =>
                updateParams({ result: e.target.value || undefined })
              }
            />
          </div>

          <div className="w-full sm:w-36">
            <Select
              aria-label="Rows per page"
              value={String(limit)}
              options={PAGE_SIZE_OPTIONS}
              onChange={(e) =>
                updateParams({ limit: e.target.value, page: '1' })
              }
            />
          </div>

          {datePreset === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                aria-label="From date"
                className="w-auto"
                value={customFrom ?? ''}
                onChange={(e) =>
                  updateParams({ from: e.target.value || undefined })
                }
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                aria-label="To date"
                className="w-auto"
                value={customTo ?? ''}
                onChange={(e) =>
                  updateParams({ to: e.target.value || undefined })
                }
              />
            </div>
          )}

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <RotateCcw className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </div>

        {(entityId || parentId || relatedId || actorId) && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-2.5 text-xs">
            <span className="font-medium text-muted-foreground">
              Context filters:
            </span>
            {relatedId && (
              <Badge variant="outline" className="gap-1 font-mono">
                Course: {relatedId.slice(0, 8)}…
                <button
                  type="button"
                  aria-label="Remove course filter"
                  className="border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => updateParams({ relatedId: undefined })}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {parentId && (
              <Badge variant="outline" className="gap-1 font-mono">
                Parent: {parentId.slice(0, 8)}…
                <button
                  type="button"
                  aria-label="Remove parent filter"
                  className="border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => updateParams({ parentId: undefined })}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {entityId && (
              <Badge variant="outline" className="gap-1 font-mono">
                Target: {entityId.slice(0, 8)}…
                <button
                  type="button"
                  aria-label="Remove target filter"
                  className="border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => updateParams({ entityId: undefined })}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {actorId && (
              <Badge variant="outline" className="gap-1 font-mono">
                Actor: {actorId.slice(0, 8)}…
                <button
                  type="button"
                  aria-label="Remove actor filter"
                  className="border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => updateParams({ actorId: undefined })}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>

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
              title="No audit logs found"
              description={
                hasFilters
                  ? 'Try broadening your search or clearing the active filters.'
                  : 'Administrative changes and login events will appear here.'
              }
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={clearAllFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          }
        >
          {(res) => (
            <>
              <Table
                columns={columns}
                data={res.items}
                keyExtractor={(item) => item.id}
                onRowClick={(item) => setSelectedLog(item)}
              />
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
        onFilterByTarget={(log) => {
          if (log.entityId) {
            updateParams({
              entityType: log.entityType,
              entityId: log.entityId,
              parentId: undefined,
              relatedId: undefined,
            });
          } else if (log.parentId) {
            updateParams({
              parentId: log.parentId,
              entityId: undefined,
              relatedId: undefined,
            });
          }
        }}
        onFilterByActor={(nextActorId) =>
          updateParams({ actorId: nextActorId })
        }
      />
    </>
  );
};

export default AuditLogsPage;
