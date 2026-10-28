import { useState } from 'react';
import { useParams } from 'react-router';
import { Download, Search, Upload, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@core/api/errors';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { downloadCsv } from '@shared/utils/download';
import { toAsyncState } from '@shared/utils/async-state';
import { useCourse } from '@features/courses';
import { participantManagementService } from '../api/participant-management.service';
import { AddParticipantsPanel } from '../components/AddParticipantsPanel';
import { AlphabetFilter } from '../components/AlphabetFilter';
import { ImportParticipantsModal } from '../components/ImportParticipantsModal';
import { ParticipantTable } from '../components/ParticipantTable';
import { RemoveParticipantConfirm } from '../components/RemoveParticipantConfirm';
import { useParticipants } from '../hooks/useParticipants';
import type { ParticipantView } from '../types/participant-management.types';
import {
  EMPTY_FILTERS,
  filterParticipants,
  isFiltered,
  type ParticipantFilters,
} from '../utils/participant-filter';
import { buildParticipantsCsv, participantsFileName } from '../utils/participant-csv';

/** Members tab of a lecturer's class: enrolled students (from `/participants`) with search, letter filters, add and remove. */
const CourseMembersPage = () => {
  const { courseId = '' } = useParams();
  const course = useCourse(courseId).data;
  const participants = toAsyncState(useParticipants(courseId));
  const [filters, setFilters] = useState<ParticipantFilters>(EMPTY_FILTERS);
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [removing, setRemoving] = useState<ParticipantView | null>(null);

  // Participants are frozen once the class has ended: the server answers 409, so the UI hides the controls.
  // `isActive` is optional on the type (mock data), so only an explicit `false` counts as ended.
  const canChange = course?.isActive !== false;
  const classCode = course?.classCode ?? '';

  const setFilter = <K extends keyof ParticipantFilters>(
    key: K,
    value: ParticipantFilters[K],
  ) => setFilters((prev) => ({ ...prev, [key]: value }));

  /** Exports the whole class, not just the rows that match the filters. */
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const all = await participantManagementService.getParticipants(courseId);
      if (all.length === 0) {
        toast.info('There are no participants to export.');
        return;
      }
      downloadCsv(buildParticipantsCsv(all), participantsFileName(classCode || courseId));
      toast.success(`Exported ${all.length} participant${all.length === 1 ? '' : 's'}.`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-2xl font-semibold">Enrolled users</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void handleExport()} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting…' : 'Export'}
          </Button>
          {canChange && (
            <>
              <Button variant="outline" onClick={() => setIsImporting(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add participants
              </Button>
            </>
          )}
        </div>
      </div>
      {!canChange && (
        <p
          role="status"
          className="m-0 rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground"
        >
          This class has ended. Its participants can still be viewed and exported, but no
          longer changed.
        </p>
      )}
      {canChange && isAdding && (
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
        <Button
          variant="outline"
          disabled={!isFiltered(filters)}
          onClick={() => setFilters(EMPTY_FILTERS)}
        >
          Clear filters
        </Button>
      </div>

      <AsyncView
        state={participants}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            title="No students yet"
            description={
              canChange
                ? 'Use “Add participants” or Import to enroll the first students.'
                : 'Nobody was enrolled in this class.'
            }
          />
        }
      >
        {(all) => {
          const list = filterParticipants(all, filters);
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
                <ParticipantTable
                  participants={list}
                  onRemove={canChange ? setRemoving : undefined}
                />
              )}
            </div>
          );
        }}
      </AsyncView>
      <ImportParticipantsModal
        open={isImporting}
        classId={courseId}
        classCode={classCode}
        onClose={() => setIsImporting(false)}
      />
      <RemoveParticipantConfirm
        participant={removing}
        classId={courseId}
        classCode={classCode}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
};

export default CourseMembersPage;
