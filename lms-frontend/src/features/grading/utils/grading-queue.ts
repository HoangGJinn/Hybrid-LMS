import type {
  GradingSortOrder,
  GradingTabFilter,
  GradingTypeFilter,
} from '../components/GradingDeskFilterBar';
import type { GradingQueueItem } from '../types/grading.types';

export const parseGradingTab = (raw: string | null): GradingTabFilter =>
  raw === 'graded' ? 'GRADED' : 'PENDING';

/** Prioritizes Exams by default unless `assignment` is explicitly selected. */
export const parseGradingType = (raw: string | null): GradingTypeFilter =>
  raw === 'assignment' ? 'assignment' : 'exam';

export const parseGradingSort = (raw: string | null): GradingSortOrder =>
  raw === 'oldest' ? 'oldest' : 'newest';

export const filterAndSortGradingQueue = (
  items: readonly GradingQueueItem[],
  params: {
    tab: GradingTabFilter;
    typeFilter: GradingTypeFilter;
    classFilter: string;
    searchQuery: string;
    sortOrder: GradingSortOrder;
  },
): GradingQueueItem[] => {
  const needle = params.searchQuery.trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (item.kind !== params.typeFilter) return false;
    const matchesTab =
      params.tab === 'PENDING' ? item.score === null : item.score !== null;
    if (!matchesTab) return false;
    if (params.classFilter !== 'all' && item.classId !== params.classFilter)
      return false;
    if (needle !== '') {
      const haystack = [
        item.studentName,
        item.studentCode,
        item.title,
        item.className,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    const diff =
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    return params.sortOrder === 'oldest' ? -diff : diff;
  });
};
