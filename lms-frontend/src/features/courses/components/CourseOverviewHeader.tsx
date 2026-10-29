import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import type {
  CourseFilterStatus,
  CourseSort,
  CourseViewMode,
} from '../types/courses.types';

interface CourseOverviewHeaderProps {
  status: CourseFilterStatus;
  onStatusChange: (status: CourseFilterStatus) => void;
  search: string;
  onSearchChange: (search: string) => void;
  sort: CourseSort;
  onSortChange: (sort: CourseSort) => void;
  viewMode: CourseViewMode;
  onViewModeChange: (viewMode: CourseViewMode) => void;
}

const STATUS_LABELS: Record<CourseFilterStatus, string> = {
  all: 'All',
  in_progress: 'In progress',
  future: 'Future',
  past: 'Past',
};

const SORT_LABELS: Record<CourseSort, string> = {
  last_accessed: 'Sort by last accessed',
  name: 'Sort by course name',
};

const VIEW_MODE_LABELS: Record<CourseViewMode, string> = {
  card: 'Card',
  list: 'List',
  summary: 'Summary',
};

export const CourseOverviewHeader = ({
  status,
  onStatusChange,
  search,
  onSearchChange,
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
}: CourseOverviewHeaderProps) => {
  const [statusOpen, setStatusOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  const statusRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (statusRef.current && !statusRef.current.contains(target)) {
        setStatusOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(target)) {
        setSortOpen(false);
      }
      if (viewRef.current && !viewRef.current.contains(target)) {
        setViewOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      {/* 1. Status Filter Dropdown */}
      <div className="relative" ref={statusRef}>
        <button
          type="button"
          onClick={() => {
            setStatusOpen(!statusOpen);
            setSortOpen(false);
            setViewOpen(false);
          }}
          className="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium text-foreground shadow-xs transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/20"
          aria-haspopup="listbox"
          aria-expanded={statusOpen}
        >
          <span>{STATUS_LABELS[status]}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        {statusOpen && (
          <div className="absolute left-0 top-full z-30 mt-1 min-w-[160px] rounded-md border bg-card p-1 shadow-lg">
            {(Object.keys(STATUS_LABELS) as CourseFilterStatus[]).map((key) => {
              const active = status === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onStatusChange(key);
                    setStatusOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-sm transition ${
                    active
                      ? 'bg-accent font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                  }`}
                >
                  <span className="w-4">
                    {active && <Check className="h-4 w-4 text-primary" />}
                  </span>
                  <span>{STATUS_LABELS[key]}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Search Input */}
      <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm kiếm khóa học..."
          className="h-9 w-full rounded-md border bg-card pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Xóa tìm kiếm"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 sm:ml-auto">
        {/* 3. Sort Dropdown */}
        <div className="relative" ref={sortRef}>
          <button
            type="button"
            onClick={() => {
              setSortOpen(!sortOpen);
              setStatusOpen(false);
              setViewOpen(false);
            }}
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium text-foreground shadow-xs transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
          >
            <span>{SORT_LABELS[sort]}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>

          {sortOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 min-w-[200px] rounded-md border bg-card p-1 shadow-lg">
              {(Object.keys(SORT_LABELS) as CourseSort[]).map((key) => {
                const active = sort === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      onSortChange(key);
                      setSortOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-sm transition ${
                      active
                        ? 'bg-accent font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                    }`}
                  >
                    <span className="w-4">
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </span>
                    <span>{SORT_LABELS[key]}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Display Mode Dropdown */}
        <div className="relative" ref={viewRef}>
          <button
            type="button"
            onClick={() => {
              setViewOpen(!viewOpen);
              setStatusOpen(false);
              setSortOpen(false);
            }}
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium text-foreground shadow-xs transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-haspopup="listbox"
            aria-expanded={viewOpen}
          >
            <span>{VIEW_MODE_LABELS[viewMode]}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>

          {viewOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 min-w-[140px] rounded-md border bg-card p-1 shadow-lg">
              {(Object.keys(VIEW_MODE_LABELS) as CourseViewMode[]).map((key) => {
                const active = viewMode === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      onViewModeChange(key);
                      setViewOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-sm transition ${
                      active
                        ? 'bg-accent font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                    }`}
                  >
                    <span className="w-4">
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </span>
                    <span>{VIEW_MODE_LABELS[key]}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

