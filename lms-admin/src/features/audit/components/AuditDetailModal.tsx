import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Filter,
} from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/shared/utils/cn';
import { formatDateTime, formatRelativeTime } from '@/shared/utils/date';
import type { AuditLogItem } from '../types/audit.types';
import {
  CATEGORY_LABELS,
  ENTITY_TYPE_LABELS,
  formatChangeValue,
  getActionDotTone,
  getActionMeta,
  getTargetLink,
  summarizeUserAgent,
} from '../utils/audit-display';

export interface AuditDetailModalProps {
  log: AuditLogItem | null;
  onClose: () => void;
  onFilterByTarget?: (log: AuditLogItem) => void;
  onFilterByActor?: (actorId: string, actorLabel?: string | null) => void;
  onFilterByRequest?: (requestId: string) => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  positionLabel?: string;
}

const getStringList = (
  metadata: Record<string, unknown> | null,
  key: string,
): string[] => {
  const value = metadata?.[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
};

const CopyButton = ({
  value,
  label,
}: {
  value: string;
  label: string;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
      title={copied ? 'Copied' : `Copy ${label}`}
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border-0 bg-transparent p-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {copied ? (
        <Check className="h-3 w-3 text-success" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
};

const AuditDetailBody = ({
  log,
  onClose,
  onFilterByTarget,
  onFilterByActor,
  onFilterByRequest,
}: Pick<
  AuditDetailModalProps,
  | 'onClose'
  | 'onFilterByTarget'
  | 'onFilterByActor'
  | 'onFilterByRequest'
> & { log: AuditLogItem }) => {
  const [showRawJson, setShowRawJson] = useState(false);
  const [showFullUa, setShowFullUa] = useState(false);

  const meta = getActionMeta(log.action);
  const targetLink = getTargetLink(log);
  const studentCodes = getStringList(log.metadata, 'studentCodes');
  const classCodes = getStringList(log.metadata, 'classCodes');
  const affectedCodes = studentCodes.length > 0 ? studentCodes : classCodes;
  const changeEntries = log.changes ? Object.entries(log.changes) : [];
  const uaSummary = summarizeUserAgent(log.userAgent);
  const hasDistinctRawUa = Boolean(
    log.userAgent && uaSummary && log.userAgent.trim() !== uaSummary,
  );
  const actorDisplay = log.actorName ?? log.actorEmail;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[5px] border bg-muted/30 px-3.5 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            aria-hidden="true"
            className={cn('h-2 w-2 shrink-0 rounded-full', getActionDotTone(log))}
          />
          <span className="text-sm font-semibold text-foreground">
            {meta.label}
          </span>
          {log.result === 'FAILURE' ? (
            <span className="inline-flex items-center rounded-[3px] border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
              Failed
            </span>
          ) : (
            <span className="inline-flex items-center rounded-[3px] border bg-card px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              Succeeded
            </span>
          )}
          <span className="inline-flex items-center rounded-[3px] border bg-card px-1.5 py-0.5 text-xs text-muted-foreground">
            {CATEGORY_LABELS[log.category] ?? log.category}
          </span>
        </div>
        <div className="flex items-baseline gap-2 text-xs tabular-nums text-muted-foreground">
          <span className="font-mono text-foreground">
            {formatDateTime(log.occurredAt)}
          </span>
          <span>({formatRelativeTime(log.occurredAt)})</span>
        </div>
      </div>

      {log.summary && (
        <div
          className={cn(
            'rounded-[5px] border px-3.5 py-2.5 text-[13px]',
            log.result === 'FAILURE'
              ? 'border-destructive/30 bg-destructive/[0.04] text-foreground'
              : 'bg-card text-foreground',
          )}
        >
          {log.summary}
        </div>
      )}

      <dl className="m-0 grid gap-x-6 gap-y-3.5 rounded-[5px] border bg-card p-3.5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Actor</dt>
          <dd className="m-0 mt-1">
            {actorDisplay ? (
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[13px] font-medium text-foreground">
                    {actorDisplay}
                  </span>
                  {log.actorRole && (
                    <span className="rounded-[3px] border bg-muted/40 px-1.5 py-0 font-mono text-[11px] text-muted-foreground">
                      {log.actorRole}
                    </span>
                  )}
                </div>
                {log.actorEmail && log.actorName && (
                  <p className="m-0 text-xs text-muted-foreground">
                    {log.actorEmail}
                  </p>
                )}
              </div>
            ) : (
              <span className="text-[13px] text-muted-foreground">
                {log.category === 'SECURITY' ? 'Unauthenticated' : 'System'}
              </span>
            )}
          </dd>
        </div>

        <div>
          <dt className="text-xs text-muted-foreground">
            Target ({ENTITY_TYPE_LABELS[log.entityType] ?? log.entityType})
          </dt>
          <dd className="m-0 mt-1 space-y-0.5">
            {targetLink ? (
              <Link
                to={targetLink}
                onClick={onClose}
                className="inline-block text-[13px] font-medium text-brand no-underline hover:underline"
              >
                {log.entityLabel ?? log.entityId ?? 'Open target'}
              </Link>
            ) : (
              <span className="block text-[13px] font-medium text-foreground">
                {log.entityLabel ?? log.entityId ?? 'None'}
              </span>
            )}
            {log.entityId && log.entityLabel && (
              <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                <span className="truncate">{log.entityId}</span>
                <CopyButton value={log.entityId} label="target ID" />
              </div>
            )}
          </dd>
        </div>

        <div>
          <dt className="text-xs text-muted-foreground">IP address</dt>
          <dd className="m-0 mt-1">
            {log.ipAddress ? (
              <div className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-foreground">
                <span>{log.ipAddress}</span>
                <CopyButton value={log.ipAddress} label="IP address" />
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Not recorded</span>
            )}
          </dd>
        </div>

        <div>
          <dt className="text-xs text-muted-foreground">Request ID</dt>
          <dd className="m-0 mt-1 min-w-0">
            {log.requestId ? (
              <div className="flex items-center gap-1.5 font-mono text-xs text-foreground">
                <span className="truncate">{log.requestId}</span>
                <CopyButton value={log.requestId} label="request ID" />
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Not recorded</span>
            )}
          </dd>
        </div>

        {log.userAgent && (
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-xs text-muted-foreground">Client</dt>
              {hasDistinctRawUa && (
                <button
                  type="button"
                  onClick={() => setShowFullUa((prev) => !prev)}
                  className="border-0 bg-transparent p-0 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  {showFullUa ? 'Hide raw user-agent' : 'Show raw user-agent'}
                </button>
              )}
            </div>
            <dd className="m-0 mt-1">
              <span className="text-[13px] font-medium text-foreground">
                {uaSummary}
              </span>
              {showFullUa && (
                <p className="m-0 mt-1 break-all rounded-[4px] border bg-muted/30 px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground">
                  {log.userAgent}
                </p>
              )}
            </dd>
          </div>
        )}
      </dl>

      {changeEntries.length > 0 && (
        <div>
          <h3 className="mb-1.5 mt-0 text-xs font-medium text-muted-foreground">
            Field changes ({changeEntries.length})
          </h3>
          <div className="overflow-x-auto rounded-[5px] border">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/35 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Field</th>
                  <th className="px-3 py-2 font-medium">Before</th>
                  <th className="px-3 py-2 font-medium">After</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {changeEntries.map(([field, diff]) => (
                  <tr key={field}>
                    <td className="whitespace-nowrap px-3 py-2 font-mono font-medium text-foreground">
                      {field}
                    </td>
                    <td className="bg-destructive/[0.04] px-3 py-2 font-mono text-destructive">
                      {formatChangeValue(diff.from)}
                    </td>
                    <td className="bg-success/[0.05] px-3 py-2 font-mono text-success">
                      {formatChangeValue(diff.to)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {affectedCodes.length > 0 && (
        <div className="rounded-[5px] border bg-muted/20 p-3">
          <p className="mb-2 mt-0 text-xs font-medium text-muted-foreground">
            Affected codes ({affectedCodes.length})
          </p>
          <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
            {affectedCodes.map((code) => (
              <span
                key={code}
                className="rounded-[3px] border bg-card px-2 py-0.5 font-mono text-xs text-foreground"
              >
                {code}
              </span>
            ))}
          </div>
        </div>
      )}

      {log.metadata && (
        <div>
          <button
            type="button"
            onClick={() => setShowRawJson((prev) => !prev)}
            className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {showRawJson ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            Metadata JSON
          </button>
          {showRawJson && (
            <pre className="mt-2 max-h-48 overflow-auto rounded-[5px] border bg-muted/30 p-3 font-mono text-xs">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <div className="flex flex-wrap gap-2">
          {onFilterByTarget && (log.entityId || log.parentId) && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-[5px] shadow-none"
              onClick={() => {
                onFilterByTarget(log);
                onClose();
              }}
            >
              <Filter className="h-3.5 w-3.5" />
              Filter by target
            </Button>
          )}
          {onFilterByActor && log.actorId && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-[5px] shadow-none"
              onClick={() => {
                onFilterByActor(
                  log.actorId as string,
                  log.actorName ?? log.actorEmail,
                );
                onClose();
              }}
            >
              <Filter className="h-3.5 w-3.5" />
              Filter by actor
            </Button>
          )}
          {onFilterByRequest && log.requestId && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-[5px] shadow-none"
              onClick={() => {
                onFilterByRequest(log.requestId as string);
                onClose();
              }}
            >
              <Filter className="h-3.5 w-3.5" />
              Correlate request
            </Button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-[5px] shadow-none"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </div>
  );
};

export const AuditDetailModal = ({
  log,
  onClose,
  onFilterByTarget,
  onFilterByActor,
  onFilterByRequest,
  onNavigate,
  hasPrev = false,
  hasNext = false,
  positionLabel,
}: AuditDetailModalProps) => {
  useEffect(() => {
    if (!log || !onNavigate) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select')) return;
      if (event.key === 'ArrowLeft' && hasPrev) {
        event.preventDefault();
        onNavigate('prev');
      } else if (event.key === 'ArrowRight' && hasNext) {
        event.preventDefault();
        onNavigate('next');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [log, onNavigate, hasPrev, hasNext]);

  const headerActions =
    log && onNavigate ? (
      <div className="flex items-center gap-1.5">
        {positionLabel && (
          <span className="mr-1 font-mono text-xs tabular-nums text-muted-foreground">
            {positionLabel}
          </span>
        )}
        <button
          type="button"
          aria-label="Previous event"
          title="Previous event (←)"
          disabled={!hasPrev}
          onClick={() => onNavigate('prev')}
          className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] border bg-card p-0 text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Next event"
          title="Next event (→)"
          disabled={!hasNext}
          onClick={() => onNavigate('next')}
          className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] border bg-card p-0 text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    ) : undefined;

  return (
    <Modal
      open={log !== null}
      title="Event details"
      size="xl"
      className="rounded-[6px] shadow-lg"
      headerActions={headerActions}
      onClose={onClose}
    >
      {log && (
        <AuditDetailBody
          key={log.id}
          log={log}
          onClose={onClose}
          onFilterByTarget={onFilterByTarget}
          onFilterByActor={onFilterByActor}
          onFilterByRequest={onFilterByRequest}
        />
      )}
    </Modal>
  );
};
