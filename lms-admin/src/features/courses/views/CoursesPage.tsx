import { useState } from 'react';
import { Archive, Pencil, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { AsyncView } from '@/shared/components/AsyncView';
import { EmptyState } from '@/shared/components/EmptyState';
import { Pagination } from '@/shared/components/Pagination';
import { Table, type Column } from '@/shared/components/Table';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { formatDate } from '@/shared/utils/date';
import { CourseFormModal } from '../components/CourseFormModal';
import { DeactivateConfirm } from '../components/DeactivateConfirm';
import { useClasses } from '../hooks/useClasses';
import { useSemesters } from '../hooks/useCourseLookups';
import type { ClassStatusFilter, ClassView } from '../types/courses.types';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

const STATUS_OPTIONS: { value: ClassStatusFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'ended', label: 'Ended' },
  { value: 'all', label: 'All statuses' },
];

const isStatusFilter = (value: string): value is ClassStatusFilter =>
  STATUS_OPTIONS.some((option) => option.value === value);

const CoursesPage = () => {
  const [searchInput, setSearchInput] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [status, setStatus] = useState<ClassStatusFilter>('active');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ open: boolean; course: ClassView | null }>({
    open: false,
    course: null,
  });
  const [deactivating, setDeactivating] = useState<ClassView | null>(null);

  const search = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const classes = useClasses({ status, semesterId, search });
  const semesters = useSemesters();

  const openCreate = () => setForm({ open: true, course: null });
  const openEdit = (course: ClassView) => setForm({ open: true, course });
  // `course` is kept while closing so the dialog title does not flicker.
  const closeForm = () => setForm((prev) => ({ ...prev, open: false }));

  const data = classes.data ?? [];
  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  // The list can shrink under the user (deactivate, filters): never point past the last page.
  const currentPage = Math.min(page, totalPages);
  const pageRows = data.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const columns: Column<ClassView>[] = [
    {
      key: 'classCode',
      header: 'Code',
      render: (item) => <span className="font-semibold">{item.classCode}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      className: 'min-w-48',
      render: (item) => item.name,
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (item) => (
        <span title={item.subjectName}>{item.subjectCode || '—'}</span>
      ),
    },
    {
      key: 'semester',
      header: 'Semester',
      render: (item) => (
        <span title={item.semesterName}>{item.semesterCode || '—'}</span>
      ),
    },
    {
      key: 'lecturer',
      header: 'Lecturer',
      render: (item) => item.lecturerName || '—',
    },
    {
      key: 'students',
      header: 'Students',
      className: 'text-right',
      render: (item) => item.studentCount ?? 0,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) =>
        item.isActive ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge title={`Ended ${formatDate(item.endedAt)}`}>Ended</Badge>
        ),
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
            aria-label={`Edit ${item.classCode}`}
            title="Edit"
            onClick={() => openEdit(item)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {item.isActive && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Deactivate ${item.classCode}`}
              title="Deactivate"
              onClick={() => setDeactivating(item)}
            >
              <Archive className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Courses"
        subtitle="Create and manage classes for every semester."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add course
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_12rem]">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Search courses"
            placeholder="Search by code or name…"
            className="pl-9"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          aria-label="Filter by semester"
          placeholder="All semesters"
          value={semesterId}
          options={(semesters.data ?? []).map((semester) => ({
            value: semester.id,
            label: semester.name,
          }))}
          onChange={(event) => {
            setSemesterId(event.target.value);
            setPage(1);
          }}
        />
        <Select
          aria-label="Filter by status"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(event) => {
            if (isStatusFilter(event.target.value)) setStatus(event.target.value);
            setPage(1);
          }}
        />
      </div>

      <div
        aria-busy={classes.isFetching}
        className={classes.isPlaceholderData ? 'opacity-60 transition-opacity' : ''}
      >
        <AsyncView
          state={{
            data: classes.data,
            loading: classes.isLoading,
            error: classes.error,
            reload: () => void classes.refetch(),
          }}
          isEmpty={(rows) => rows.length === 0}
          empty={
            <EmptyState
              title="No courses found"
              description="Try changing the filters, or add a new course."
              action={
                <Button variant="outline" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Add course
                </Button>
              }
            />
          }
        >
          {() => (
            <>
              <Table
                columns={columns}
                data={pageRows}
                keyExtractor={(item) => item.id}
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

      <CourseFormModal open={form.open} course={form.course} onClose={closeForm} />
      <DeactivateConfirm course={deactivating} onClose={() => setDeactivating(null)} />
    </>
  );
};

export default CoursesPage;
