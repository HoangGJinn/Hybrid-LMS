import type {
  GradingSortOrder,
  GradingTabFilter,
  GradingTypeFilter,
} from '../components/GradingDeskFilterBar';
import type {
  GradingItemKind,
  GradingQueueItem,
} from '../types/grading.types';

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

/** Stable key of the exam / assignment (within a class) a queue item belongs to. */
export const gradingGroupKey = (item: GradingQueueItem): string => {
  const refId = item.kind === 'exam' ? item.examId : item.submission.assignmentId;
  return `${item.kind}:${item.classId}:${refId}`;
};

export interface GradingGroup {
  key: string;
  kind: GradingItemKind;
  title: string;
  className: string;
  items: GradingQueueItem[];
}

/** Groups items by exam / assignment, keeping the order in which each group first appears. */
export const groupGradingQueue = (
  items: readonly GradingQueueItem[],
): GradingGroup[] => {
  const groups = new Map<string, GradingGroup>();
  for (const item of items) {
    const key = gradingGroupKey(item);
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(key, {
        key,
        kind: item.kind,
        title: item.title,
        className: item.className,
        items: [item],
      });
    }
  }
  return [...groups.values()];
};

/** Graded / total counts per group, computed over the unfiltered queue so progress stays meaningful. */
export const gradingProgressByGroup = (
  items: readonly GradingQueueItem[],
): Map<string, { graded: number; total: number }> => {
  const progress = new Map<string, { graded: number; total: number }>();
  for (const item of items) {
    const key = gradingGroupKey(item);
    const entry = progress.get(key) ?? { graded: 0, total: 0 };
    entry.total += 1;
    if (item.score !== null) entry.graded += 1;
    progress.set(key, entry);
  }
  return progress;
};