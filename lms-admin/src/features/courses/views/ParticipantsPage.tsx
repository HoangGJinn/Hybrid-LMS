import { useState } from 'react';
import { useParams } from 'react-router';
import { toast } from 'sonner';
import { Download, Search, Upload, UserMinus, UserPlus } from 'lucide-react';
import { getErrorMessage } from '@/core/api/errors';
import { AsyncView } from '@/shared/components/AsyncView';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { Pagination } from '@/shared/components/Pagination';
import { Table, type Column } from '@/shared/components/Table';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { formatDate } from '@/shared/utils/date';
import { downloadCsv } from '@/shared/utils/download';
import { participantService } from '../api/participant.service';
import { AddParticipantModal } from '../components/AddParticipantModal';
import { ImportParticipantsModal } from '../components/ImportParticipantsModal';
import { RemoveParticipantConfirm } from '../components/RemoveParticipantConfirm';
import { useClass } from '../hooks/useClass';
import { useParticipants } from '../hooks/useParticipants';
import type { ClassView, ParticipantView } from '../types/courses.types';
import {
  buildParticipantsCsv,
  participantsFileName,
} from '../utils/participant-csv';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

const ParticipantsContent = ({ course }: { course: ClassView }) => {
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [removing, setRemoving] = useState<ParticipantView | null>(null);
  const [exporting, setExporting] = useState(false);

  const search = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const participants = useParticipants(course.id, search);
  // Participants are frozen once the class has ended: the server refuses changes, so the UI hides them.
  const canChange = course.isActive;
  const isSearching = search.trim() !== '';

  const data = participants.data ?? [];
  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  // The list can shrink under the user (remove, search): never point past the last page.
  const currentPage = Math.min(page, totalPages);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRows = data.slice(firstIndex, firstIndex + PAGE_SIZE);

  /** Exports the whole class, not just the rows that match the search box. */
  const handleExport = async () => {
    setExporting(true);
    try {
      const all = await participantService.getParticipants(course.id);
      if (all.length === 0) {
        toast.info('There are no participants to export.');
        return;
      }
      downloadCsv(buildParticipantsCsv(all), participantsFileName(course.classCode));
      toast.success(`Exported ${all.length} participant${all.length === 1 ? '' : 's'}.`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<ParticipantView>[] = [
    {
      key: 'index',
      header: '#',
      className: 'w-12 text-muted-foreground',
      render: (_item, index) => firstIndex + index + 1,
    },
    {
      key: 'studentCode',
      header: 'Student code',
      render: (item) => <span className="font-semibold">{item.studentCode}</span>,
    },
    {
      key: 'fullName',
      header: 'Full name',
      className: 'min-w-44',
      render: (item) => (
        <span className="flex items-center gap-2">
          {item.fullName}
          {!item.isActive && <Badge variant="warning">Deactivated</Badge>}
        </span>
      ),
    },
    { key: 'email', header: 'Email', render: (item) => item.email },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <Badge variant={item.status === 'STUDYING' ? 'success' : 'default'}>
          {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
        </Badge>
      ),
    },
    {
      key: 'joinedAt',
      header: 'Joined',
      render: (item) => formatDate(item.joinedAt),
    },
    ...(canChange
      ? [
          {
            key: 'actions',
            header: 'Actions',
            className: 'text-right',
            render: (item: ParticipantView) => (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${item.fullName}`}
                  title="Remove Participant"
                  onClick={() => setRemoving(item)}
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Manage Participants"
        subtitle={`${course.classCode} — ${course.name}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void handleExport()} isLoading={exporting}>
              {!exporting && <Download className="h-4 w-4" />}
              Export
            </Button>
            {canChange && (
              <>
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
                <Button onClick={() => setAddOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  Add Participant
                </Button>
              </>
            )}
          </div>
        }
      />

      {!canChange && (
        <p
          role="status"
          className="mb-4 rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground"
        >
          This class has ended. Its participants can still be viewed and
          exported, but no longer changed.
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1 sm:max-w-sm">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Search participants"
            placeholder="Search by name, email or student code…"
            className="pl-9"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {course.studentCount ?? 0} participant
          {(course.studentCount ?? 0) === 1 ? '' : 's'} in this class
        </span>
      </div>

      <div
        aria-busy={participants.isFetching}
        className={participants.isPlaceholderData ? 'opacity-60 transition-opacity' : ''}
      >
        <AsyncView
          state={{
            data: participants.data,
            loading: participants.isLoading,
            error: participants.error,
            reload: () => void participants.refetch(),
          }}
          isEmpty={(rows) => rows.length === 0}
          empty={
            <EmptyState
              title={isSearching ? 'No participants match your search' : 'No participants yet'}
              description={
                isSearching
                  ? 'Try a different name, email or student code.'
                  : canChange
                    ? 'Add students one by one, or import a CSV file.'
                    : 'Nobody was enrolled in this class.'
              }
              action={
                !isSearching && canChange ? (
                  <Button variant="outline" onClick={() => setAddOpen(true)}>
                    <UserPlus className="h-4 w-4" />
                    Add Participant
                  </Button>
                ) : undefined
              }
            />
          }
        >
          {() => (
            <>
              <Table
                columns={columns}
                data={pageRows}
                keyExtractor={(item) => item.studentId}
              />
              <Pagination
                page={currentPage}
                pageSize={PAGE_SIZE}
                total={data.length}
                onPageChange={setPage}
              />
            </>
          )}
        </AsyncView>
      </div>

      <AddParticipantModal open={addOpen} course={course} onClose={() => setAddOpen(false)} />
      <ImportParticipantsModal
        open={importOpen}
        course={course}
        onClose={() => setImportOpen(false)}
      />
      <RemoveParticipantConfirm
        participant={removing}
        course={course}
        onClose={() => setRemoving(null)}
      />
    </>
  );
};

/** "Manage Participants" (UC-23): the student list of a class with Add Participant, Remove Participant, Import and Export. */
const ParticipantsPage = () => {
  const { classId = '' } = useParams();
  const course = useClass(classId);

  return (
    <AsyncView
      state={{
        data: course.data,
        loading: course.isLoading,
        error: course.error,
        reload: () => void course.refetch(),
      }}
    >
      {(item) => <ParticipantsContent course={item} />}
    </AsyncView>
  );
};

export default ParticipantsPage;
