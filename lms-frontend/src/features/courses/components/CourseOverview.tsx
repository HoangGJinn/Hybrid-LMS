import { useState } from 'react';
import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';
import { EmptyState } from '@shared/components/EmptyState';
import { LoadingState } from '@shared/components/LoadingState';
import { PageHeader } from '@shared/components/PageHeader';
import { Pagination } from '@shared/components/Pagination';
import { useMyCourses } from '../hooks/useClasses';
import { CourseOverviewHeader } from './CourseOverviewHeader';
import { CourseCard } from './CourseCard';
import { CourseListItem } from './CourseListItem';
import { CourseSummaryItem } from './CourseSummaryItem';
import type {
  CourseFilterStatus,
  CourseSort,
  CourseViewMode,
} from '../types/courses.types';

interface CourseOverviewProps {
  basePath: string; // e.g. '/student/courses' or '/lecturer/classes'
  title: string;
  subtitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

const DEBOUNCE_SEARCH_MS = 300;
const CARD_LIST_PAGE_SIZE = 6;
const SUMMARY_PAGE_SIZE = 9;

export const CourseOverview = ({
  basePath,
  title,
  subtitle,
  emptyTitle = 'Không tìm thấy khóa học',
  emptyDescription = 'Không có khóa học nào phù hợp với bộ lọc hiện tại.',
}: CourseOverviewProps) => {
  const [status, setStatus] = useState<CourseFilterStatus>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<CourseSort>('last_accessed');
  const [viewMode, setViewMode] = useState<CourseViewMode>('card');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, DEBOUNCE_SEARCH_MS);

  const limit =
    viewMode === 'summary' ? SUMMARY_PAGE_SIZE : CARD_LIST_PAGE_SIZE;

  const { data, isLoading, isError, error } = useMyCourses({
    page,
    limit,
    search: debouncedSearch || undefined,
    status,
    sort,
  });

  const handleStatusChange = (newStatus: CourseFilterStatus) => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    setPage(1);
  };

  const handleSortChange = (newSort: CourseSort) => {
    setSort(newSort);
    setPage(1);
  };

  const handleViewModeChange = (newMode: CourseViewMode) => {
    setViewMode(newMode);
    setPage(1);
  };

  const courses = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />

      <CourseOverviewHeader
        status={status}
        onStatusChange={handleStatusChange}
        search={search}
        onSearchChange={handleSearchChange}
        sort={sort}
        onSortChange={handleSortChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />

      {isLoading ? (
        <LoadingState rows={limit} />
      ) : isError ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          Không thể tải danh sách khóa học:{' '}
          {error instanceof Error ? error.message : 'Lỗi không xác định'}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          {viewMode === 'card' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  basePath={basePath}
                />
              ))}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="flex flex-col gap-3">
              {courses.map((course) => (
                <CourseListItem
                  key={course.id}
                  course={course}
                  basePath={basePath}
                />
              ))}
            </div>
          )}

          {viewMode === 'summary' && (
            <div className="max-h-[580px] space-y-3 overflow-y-auto pr-1">
              {courses.map((course) => (
                <CourseSummaryItem
                  key={course.id}
                  course={course}
                  basePath={basePath}
                />
              ))}
            </div>
          )}

          <Pagination
            page={page}
            pageSize={limit}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
};

