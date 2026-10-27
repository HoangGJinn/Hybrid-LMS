import { useState } from 'react';
import { Archive, Pencil, Plus, RotateCcw, Search } from 'lucide-react';
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
import { formatDate } from '@/shared/utils/date';
import { initials } from '@/shared/utils/initials';
import { useUsers } from '../hooks/useUsers';
import type {
  AccountFilter,
  ManagedRole,
  ManagedUser,
} from '../types/users.types';
import { ROLE_CONFIG } from '../utils/role-config';
import {
  ACCOUNT_STATE_BADGES,
  getAccountState,
  getStatusLabel,
  getStatusVariant,
  toHasLoggedIn,
  toIsActive,
} from '../utils/user-display';
import { UserFormModal } from './UserFormModal';
import { UserStatusConfirm, type StatusTarget } from './UserStatusConfirm';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

const ACCOUNT_OPTIONS: { value: AccountFilter; label: string }[] = [
  { value: 'all', label: 'All accounts' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
];

const isAccountFilter = (value: string): value is AccountFilter =>
  ACCOUNT_OPTIONS.some((option) => option.value === value);

/** Shared body of the Students and Lecturers pages: search, filter, paged table, add / edit / (de)activate. */
export const UserManagement = ({ role }: { role: ManagedRole }) => {
  const config = ROLE_CONFIG[role];
  const [searchInput, setSearchInput] = useState('');
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('all');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ open: boolean; user: ManagedUser | null }>({
    open: false,
    user: null,
  });
  const [statusTarget, setStatusTarget] = useState<StatusTarget | null>(null);

  const search = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const users = useUsers({
    role,
    isActive: toIsActive(accountFilter),
    hasLoggedIn: toHasLoggedIn(accountFilter),
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
  });

  // The last page can disappear under the user (e.g. after deactivating the only row of a filtered page).
  const totalPages = users.data?.totalPages;

  if (totalPages !== undefined && totalPages > 0 && page > totalPages) {
    setPage(totalPages);
  }

  const openCreate = () => setForm({ open: true, user: null });
  const openEdit = (user: ManagedUser) => setForm({ open: true, user });
  // `user` is kept while closing so the dialog title does not flicker.
  const closeForm = () => setForm((prev) => ({ ...prev, open: false }));

  const columns: Column<ManagedUser>[] = [
    {
      key: 'name',
      header: 'Name',
      className: 'min-w-56',
      render: (item) => (
        <div className="flex items-center gap-3">
          {item.avatarUrl ? (
            <img
              src={item.avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
            >
              {initials(item.fullName)}
            </div>
          )}
          <div className="min-w-0">
            <p className="m-0 truncate font-medium">{item.fullName}</p>
            <p className="m-0 truncate text-xs text-muted-foreground">
              {item.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'code',
      header: config.codeLabel,
      render: (item) => <span className="font-mono text-xs">{item.code ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) =>
        item.profileStatus ? (
          <Badge variant={getStatusVariant(item.profileStatus)}>
            {getStatusLabel(role, item.profileStatus)}
          </Badge>
        ) : (
          '—'
        ),
    },
    {
      key: 'account',
      header: 'Account',
      render: (item) => {
        const badge = ACCOUNT_STATE_BADGES[getAccountState(item)];
        return (
          <Badge variant={badge.variant} title={badge.hint}>
            {badge.label}
          </Badge>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (item) => formatDate(item.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${item.fullName}`}
            title="Edit"
            onClick={() => openEdit(item)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {item.isActive ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Deactivate ${item.fullName}`}
              title="Deactivate"
              onClick={() => setStatusTarget({ user: item, action: 'deactivate' })}
            >
              <Archive className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Activate ${item.fullName}`}
              title="Activate"
              onClick={() => setStatusTarget({ user: item, action: 'activate' })}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {config.addLabel}
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label={`Search ${config.plural}`}
            placeholder="Search by name or email…"
            className="pl-9"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          aria-label="Filter by account status"
          value={accountFilter}
          options={ACCOUNT_OPTIONS}
          onChange={(event) => {
            if (isAccountFilter(event.target.value))
              setAccountFilter(event.target.value);
            setPage(1);
          }}
        />
      </div>

      <div
        aria-busy={users.isFetching}
        className={users.isPlaceholderData ? 'opacity-60 transition-opacity' : ''}
      >
        <AsyncView
          state={{
            data: users.data,
            loading: users.isLoading,
            error: users.error,
            reload: () => void users.refetch(),
          }}
          isEmpty={(result) => result.items.length === 0}
          empty={
            <EmptyState
              title={`No ${config.plural} found`}
              description={`Try changing the search or the filter, or add a ${config.singular}.`}
              action={
                <Button variant="outline" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  {config.addLabel}
                </Button>
              }
            />
          }
        >
          {(result) => (
            <>
              <Table
                columns={columns}
                data={result.items}
                keyExtractor={(item) => item.id}
                rowClassName={(item) =>
                  !item.isActive
                    ? 'bg-destructive/10 hover:bg-destructive/20'
                    : undefined
                }
              />
              <Pagination
                page={Math.min(page, result.totalPages)}
                pageSize={PAGE_SIZE}
                total={result.total}
                onPageChange={setPage}
              />
            </>
          )}
        </AsyncView>
      </div>

      <UserFormModal
        open={form.open}
        role={role}
        user={form.user}
        onClose={closeForm}
      />
      <UserStatusConfirm
        target={statusTarget}
        role={role}
        onClose={() => setStatusTarget(null)}
      />
    </>
  );
};
