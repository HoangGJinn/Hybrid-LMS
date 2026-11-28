import { useMemo, useState } from 'react';
import { ExternalLink, FileSpreadsheet, Search } from 'lucide-react';
import { Link } from 'react-router';
import { AsyncView } from '@/shared/components/AsyncView';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { Table, type Column } from '@/shared/components/Table';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { cn } from '@/shared/utils/cn';
import { formatDate } from '@/shared/utils/date';
import { initials } from '@/shared/utils/initials';
import { useUserClasses } from '../hooks/useUserClasses';
import type {
  ManagedRole,
  ManagedUser,
  UserClassItem,
} from '../types/users.types';
import { ROLE_CONFIG } from '../utils/role-config';
import {
  ACCOUNT_STATE_BADGES,
  getAccountState,
  getStatusLabel,
  getStatusVariant,
} from '../utils/user-display';

type StatusFilter = 'all' | 'active' | 'ended';

interface UserClassesModalProps {
  user: ManagedUser | null;
  role: ManagedRole;
  isExporting: boolean;
  onExport: (user: ManagedUser) => void;
  onClose: () => void;
}

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'ended', label: 'Ended' },
];

const matchesSearch = (item: UserClassItem, term: string): boolean => {
  if (!term) return true;
  const haystacks = [
    item.classCode,
    item.name,
    item.subjectCode,
    item.subjectName,
    item.semesterCode,
    item.semesterName,
    item.lecturerName,
  ];
  return haystacks.some((value) => value.toLowerCase().includes(term));
};

/** Detailed modal showing every class taught by a lecturer or enrolled in by a student. */
export const UserClassesModal = ({
  user,
  role,
  isExporting,
  onExport,
  onClose,
}: UserClassesModalProps) => {
  const config = ROLE_CONFIG[role];
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const classesQuery = useUserClasses(role, user?.id ?? null);

  const handleClose = () => {
    setStatusFilter('all');
    setSearch('');
    onClose();
  };

  const rows = useMemo(() => classesQuery.data ?? [], [classesQuery.data]);
  const counts = useMemo(() => {
    const active = rows.filter((row) => row.isActive).length;
    return {
      all: rows.length,
      active,
      ended: rows.length - active,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter === 'active' && !row.isActive) return false;
      if (statusFilter === 'ended' && row.isActive) return false;
      return matchesSearch(row, term);
    });
  }, [rows, statusFilter, search]);

  const columns: Column<UserClassItem>[] = [
    {
      key: 'classCode',
      header: 'Class code',
      render: (item) => (
        <Link
          to={`/courses/${item.id}`}
          onClick={handleClose}
          className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-brand no-underline hover:underline"
        >
          {item.classCode}
          <ExternalLink className="h-3 w-3" />
        </Link>
      ),
    },
    {
      key: 'name',
      header: 'Class & Subject',
      className: 'min-w-52',
      render: (item) => (
        <div className="min-w-0">
          <p className="m-0 font-medium text-foreground">{item.name}</p>
          <p className="m-0 text-xs text-muted-foreground">
            {item.subjectCode ? `${item.subjectCode} · ` : ''}
            {item.subjectName || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'semester',
      header: 'Semester',
      render: (item) => (
        <div>
          <p className="m-0 text-xs font-medium">{item.semesterCode || '—'}</p>
          <p className="m-0 text-xs text-muted-foreground">
            {item.semesterName}
          </p>
        </div>
      ),
    },
    ...(role === 'STUDENT'
      ? [
          {
            key: 'lecturerName',
            header: 'Lecturer',
            render: (item: UserClassItem) => (
              <span className="text-xs">{item.lecturerName || '—'}</span>
            ),
          },
          {
            key: 'joinedAt',
            header: 'Joined',
            render: (item: UserClassItem) => (
              <span className="text-xs text-muted-foreground">
                {item.joinedAt ? formatDate(item.joinedAt) : '—'}
              </span>
            ),
          },
        ]
      : []),
    {
      key: 'studentCount',
      header: 'Students',
      className: 'text-right',
      render: (item) => (
        <span className="font-mono text-xs">{item.studentCount}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) =>
        item.isActive ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge
            title={
              item.endedAt ? `Ended ${formatDate(item.endedAt)}` : undefined
            }
          >
            Ended
          </Badge>
        ),
    },
  ];

  const accountBadge = user ? ACCOUNT_STATE_BADGES[getAccountState(user)] : null;

  return (
    <Modal
      open={user !== null}
      title={config.classesModalTitle}
      size="2xl"
      onClose={handleClose}
    >
      {user && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/40 p-4">
            <div className="flex min-w-0 items-center gap-3">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-11 w-11 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                >
                  {initials(user.fullName)}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="m-0 truncate text-base font-semibold">
                    {user.fullName}
                  </p>
                  {user.profileStatus && (
                    <Badge variant={getStatusVariant(user.profileStatus)}>
                      {getStatusLabel(role, user.profileStatus)}
                    </Badge>
                  )}
                  {accountBadge && (
                    <Badge variant={accountBadge.variant} title={accountBadge.hint}>
                      {accountBadge.label}
                    </Badge>
                  )}
                </div>
                <p className="m-0 truncate text-xs text-muted-foreground">
                  {user.email}
                  {user.code ? ` · ${config.codeLabel}: ${user.code}` : ''}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={isExporting}
              onClick={() => onExport(user)}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {isExporting ? 'Exporting…' : 'Export Excel'}
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    statusFilter === option.value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  {option.label} ({counts[option.value]})
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Filter classes"
                placeholder="Filter by code, class, subject…"
                className="h-8 pl-8 text-xs"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="flex h-[24rem] max-h-[55vh] flex-col overflow-y-auto">
            <AsyncView
              state={{
                data: classesQuery.data,
                loading: classesQuery.isLoading,
                error: classesQuery.error,
                reload: () => void classesQuery.refetch(),
              }}
              isEmpty={(list) => list.length === 0}
              empty={
                <div className="my-auto w-full">
                  <EmptyState
                    title={config.emptyClassesTitle}
                    description={config.emptyClassesDescription}
                  />
                </div>
              }
            >
              {() => (
                <Table
                  columns={columns}
                  data={filteredRows}
                  keyExtractor={(item) => item.id}
                  emptyMessage="No classes match your current filter."
                />
              )}
            </AsyncView>
          </div>

          <div className="flex justify-end border-t pt-3">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
