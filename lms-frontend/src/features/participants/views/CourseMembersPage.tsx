import { useState } from 'react';
import { useParams } from 'react-router';
import { Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { toAsyncState } from '@shared/utils/async-state';
import { AddParticipantsPanel } from '../components/AddParticipantsPanel';
import { AlphabetFilter } from '../components/AlphabetFilter';
import { RosterTable } from '../components/RosterTable';
import { useRemoveParticipant } from '../hooks/useRemoveParticipant';
import { useRoster } from '../hooks/useRoster';
import type { RosterStudent } from '../types/participants.types';
import {
  EMPTY_FILTERS,
  filterRoster,
  type RosterFilters,
  type StatusFilter,
} from '../utils/roster-filter';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'at-risk', label: 'At risk' },
  { value: 'on-track', label: 'On track' },
];

const isStatusFilter = (value: string): value is StatusFilter =>
  STATUS_OPTIONS.some((option) => option.value === value);

/** Members tab of a lecturer's class: enrolled students with filters, performance, add and remove. */
const CourseMembersPage = () => {
  const { courseId = '' } = useParams();
  const roster = toAsyncState(useRoster(courseId));
  const removeParticipant = useRemoveParticipant(courseId);
  const [filters, setFilters] = useState<RosterFilters>(EMPTY_FILTERS);
  const [isAdding, setIsAdding] = useState(false);

  const setFilter = <K extends keyof RosterFilters>(key: K, value: RosterFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));
  const isFiltered =
    filters.query !== '' ||
    filters.status !== 'all' ||
    filters.given !== '' ||
    filters.family !== '';

  const handleRemove = (student: RosterStudent) => {
    if (!window.confirm(`Remove ${student.fullName} from this class?`)) return;
    removeParticipant.mutate(student.id, {
      onSuccess: () => toast.success(`${student.fullName} removed`),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-2xl font-semibold">Enrolled users</h2>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add participants
        </Button>
      </div>
      {isAdding && (
        <AddParticipantsPanel classId={courseId} onClose={() => setIsAdding(false)} />
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-4">
        <div className="relative w-full max-w-xs">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Search participants"
            placeholder="Search by name, email or code"
            className="pl-9"
            value={filters.query}
            onChange={(event) => setFilter('query', event.target.value)}
          />
        </div>
        <select
          aria-label="Filter by status"
          value={filters.status}
          onChange={(event) => {
            if (isStatusFilter(event.target.value)) setFilter('status', event.target.value);
          }}
          className="h-9 rounded-md border bg-card px-3 text-sm"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button variant="outline" disabled={!isFiltered} onClick={() => setFilters(EMPTY_FILTERS)}>
          Clear filters
        </Button>
      </div>

      <AsyncView
        state={roster}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            title="No students yet"
            description="Use “Add participants” to enroll the first student."
          />
        }
      >
        {(all) => {
          const list = filterRoster(all, filters);
          return (
            <div className="space-y-4">
              <p className="m-0 text-sm text-muted-foreground">
                Found {list.length} participant{list.length === 1 ? '' : 's'}
              </p>
              <AlphabetFilter
                label="Given name"
                value={filters.given}
                onChange={(letter) => setFilter('given', letter)}
              />
              <AlphabetFilter
                label="Family name"
                value={filters.family}
                onChange={(letter) => setFilter('family', letter)}
              />
              {list.length === 0 ? (
                <EmptyState title="No participants match" />
              ) : (
                <RosterTable
                  students={list}
                  onRemove={handleRemove}
                  pendingId={removeParticipant.isPending ? (removeParticipant.variables ?? null) : null}
                />
              )}
            </div>
          );
        }}
      </AsyncView>
    </div>
  );
};

export default CourseMembersPage;