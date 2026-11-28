import { RotateCcw, Search, X } from 'lucide-react';
import type { ClassRoom } from '@features/courses';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { cn } from '@shared/utils/cn';
import type { GradingItemKind } from '../types/grading.types';

export type GradingTabFilter = 'PENDING' | 'GRADED';
export type GradingTypeFilter = GradingItemKind;
export type GradingSortOrder = 'newest' | 'oldest';

export interface GradingDeskFilterBarProps {
  tab: GradingTabFilter;
  typeFilter: GradingTypeFilter;
  classFilter: string;
  searchQuery: string;
  sortOrder: GradingSortOrder;
  classes: ClassRoom[];
  examPendingCount: number;
  assignmentPendingCount: number;
  sectionPendingCount: number;
  sectionGradedCount: number;
  hasActiveFilters: boolean;
  onTabChange: (tab: GradingTabFilter) => void;
  onTypeChange: (type: GradingTypeFilter) => void;
  onClassChange: (classId: string) => void;
  onSearchChange: (q: string) => void;
  onSortChange: (sort: GradingSortOrder) => void;
  onClearFilters: () => void;
}

export const GradingDeskFilterBar = ({
  tab,
  typeFilter,
  classFilter,
  searchQuery,
  sortOrder,
  classes,
  examPendingCount,
  assignmentPendingCount,
  sectionPendingCount,
  sectionGradedCount,
  hasActiveFilters,
  onTabChange,
  onTypeChange,
  onClassChange,
  onSearchChange,
  onSortChange,
  onClearFilters,
}: GradingDeskFilterBarProps) => {
  const sections: Array<{
    value: GradingTypeFilter;
    label: string;
    pendingCount: number;
  }> = [
    { value: 'exam', label: 'Exams', pendingCount: examPendingCount },
    {
      value: 'assignment',
      label: 'Assignments',
      pendingCount: assignmentPendingCount,
    },
  ];

  return (
    <div className="mb-3 space-y-2.5">
      <div
        role="tablist"
        aria-label="Grading sections"
        className="flex items-center gap-1 border-b"
      >
        {sections.map((section) => {
          const active = typeFilter === section.value;
          return (
            <button
              key={section.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTypeChange(section.value)}
              className={cn(
                'inline-flex items-center gap-2 border-b-2 px-3.5 py-2 text-sm font-semibold transition-colors',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <span>{section.label}</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {section.pendingCount}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card/60 p-2">
        <div className="flex shrink-0 items-center gap-1">
          {(
            [
              { key: 'PENDING', label: `To grade (${sectionPendingCount})` },
              { key: 'GRADED', label: `Graded (${sectionGradedCount})` },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onTabChange(item.key)}
              className={cn(
                'h-8 rounded-md border px-2.5 text-xs font-medium transition-colors',
                tab === item.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search student, ID, or title..."
            aria-label="Search submissions"
            className="h-8 pl-8 pr-7 text-xs"
          />
          {searchQuery !== '' && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <select
          aria-label="Filter by class"
          value={classFilter}
          onChange={(e) => onClassChange(e.target.value)}
          className="h-8 max-w-[220px] rounded-md border bg-background px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All classes</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.classCode ? `${cls.classCode} — ${cls.name}` : cls.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Sort submissions"
          value={sortOrder}
          onChange={(e) => onSortChange(e.target.value as GradingSortOrder)}
          className="h-8 rounded-md border bg-background px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="newest">Newest submitted</option>
          <option value="oldest">Oldest submitted</option>
        </select>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
};
