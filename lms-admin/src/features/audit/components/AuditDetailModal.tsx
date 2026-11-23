import { useState } from 'react';
import { Link } from 'react-router';
import { ChevronDown, ChevronRight, ExternalLink, Filter } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { formatDateTime } from '@/shared/utils/date';
import type { AuditLogItem } from '../types/audit.types';
import {
  ENTITY_TYPE_LABELS,
  formatChangeValue,
  getActionMeta,
  getTargetLink,
} from '../utils/audit-display';

interface AuditDetailModalProps {
  log: AuditLogItem | null;
  onClose: () => void;
  onFilterByTarget?: (log: AuditLogItem) => void;
  onFilterByActor?: (actorId: string) => void;
}

const getStringList = (
  metadata: Record<string, unknown> | null,
  key: string,
): string[] => {
  const value = metadata?.[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
};

export const AuditDetailModal = ({
  log,
  onClose,
  onFilterByTarget,
  onFilterByActor,
}: AuditDetailModalProps) => {
  const [showRawJson, setShowRawJson] = useState(false);

  const meta = log ? getActionMeta(log.action) : null;
  const targetLink = log ? getTargetLink(log) : null;
  const studentCodes = log ? getStringList(log.metadata, 'studentCodes') : [];
  const classCodes = log ? getStringList(log.metadata, 'classCodes') : [];
  const changeEntries = log?.changes ? Object.entries(log.changes) : [];

  return (
    <Modal
      open={log !== null}
      title="Audit Log Details"
      size="xl"
      onClose={() => {
        setShowRawJson(false);
        onClose();
      }}
    >
      {log && meta && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/40 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={meta.variant}>{meta.label}</Badge>
              <Badge variant={log.result === 'FAILURE' ? 'destructive' : 'success'}>
                {log.result}
              </Badge>
              <Badge variant="outline">{log.category}</Badge>
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {formatDateTime(log.occurredAt)}
            </span>
          </div>

          {log.summary && (
            <p className="m-0 text-sm font-medium text-foreground">
              {log.summary}
            </p>
          )}

          <dl className="m-0 grid gap-4 rounded-xl border p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Actor
              </dt>
              <dd className="m-0 mt-1">
                {log.actorName || log.actorEmail ? (
                  <div>
                    <span className="font-medium text-foreground">
                      {log.actorName ?? log.actorEmail}
                    </span>
                    {log.actorRole && (
                      <Badge variant="outline" className="ml-2">
                        {log.actorRole}
                      </Badge>
                    )}
                    {log.actorEmail && log.actorName && (
                      <p className="m-0 text-xs text-muted-foreground">
                        {log.actorEmail}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">System / Anonymous</span>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Target ({ENTITY_TYPE_LABELS[log.entityType] ?? log.entityType})
              </dt>
              <dd className="m-0 mt-1">
                {targetLink ? (
                  <Link
                    to={targetLink}
                    onClick={onClose}
                    className="inline-flex items-center gap-1 font-medium text-brand no-underline hover:underline"
                  >
                    {log.entityLabel ?? log.entityId ?? '—'}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <span>{log.entityLabel ?? log.entityId ?? '—'}</span>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                IP Address
              </dt>
              <dd className="m-0 mt-1 font-mono text-xs">
                {log.ipAddress ?? '—'}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Request ID
              </dt>
              <dd className="m-0 mt-1 truncate font-mono text-xs">
                {log.requestId ?? '—'}
              </dd>
            </div>

            {log.userAgent && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  User Agent
                </dt>
                <dd className="m-0 mt-1 break-all font-mono text-xs text-muted-foreground">
                  {log.userAgent}
                </dd>
              </div>
            )}
          </dl>

          {changeEntries.length > 0 && (
            <div>
              <h3 className="mb-2 mt-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Field Changes
              </h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Field</th>
                      <th className="px-3 py-2 font-semibold">Before</th>
                      <th className="px-3 py-2 font-semibold">After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {changeEntries.map(([field, diff]) => (
                      <tr key={field}>
                        <td className="px-3 py-2 font-mono font-medium">
                          {field}
                        </td>
                        <td className="bg-destructive/5 px-3 py-2 font-mono text-destructive">
                          {formatChangeValue(diff.from)}
                        </td>
                        <td className="bg-success/5 px-3 py-2 font-mono text-success">
                          {formatChangeValue(diff.to)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(studentCodes.length > 0 || classCodes.length > 0) && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="mb-2 mt-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Affected Codes ({studentCodes.length || classCodes.length})
              </p>
              <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                {(studentCodes.length > 0 ? studentCodes : classCodes).map(
                  (code) => (
                    <Badge key={code} variant="outline" className="font-mono">
                      {code}
                    </Badge>
                  ),
                )}
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
                Raw metadata JSON
              </button>
              {showRawJson && (
                <pre className="mt-2 max-h-48 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs">
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
                  onClick={() => {
                    onFilterByTarget(log);
                    onClose();
                  }}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filter by this target
                </Button>
              )}
              {onFilterByActor && log.actorId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onFilterByActor(log.actorId as string);
                    onClose();
                  }}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filter by this actor
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
