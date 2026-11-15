import { describe, expect, it } from 'vitest';
import type {
  AssignmentGradingQueueItem,
  ExamGradingQueueItem,
  GradingQueueItem,
} from '../types/grading.types';
import {
  filterAndSortGradingQueue,
  parseGradingSort,
  parseGradingTab,
  parseGradingType,
} from './grading-queue';

const assignmentItem = (
  overrides: Partial<AssignmentGradingQueueItem> = {},
): AssignmentGradingQueueItem => ({
  queueId: 'assignment:sub-1',
  kind: 'assignment',
  classId: 'class-1',
  className: 'Web Programming',
  title: 'Lab 1',
  studentId: 'stu-1',
  studentName: 'Nguyen Van Nam',
  studentCode: 'SV26000001',
  submittedAt: '2026-11-14T10:00:00Z',
  score: null,
  comment: null,
  files: [],
  answerText: 'My answer',
  submission: {} as AssignmentGradingQueueItem['submission'],
  ...overrides,
});

const examItem = (
  overrides: Partial<ExamGradingQueueItem> = {},
): ExamGradingQueueItem => ({
  queueId: 'exam:sess-1',
  kind: 'exam',
  classId: 'class-2',
  className: 'Algorithms',
  title: 'Exam 7 (Nop File)',
  examId: 'exam-7',
  sessionId: 'sess-1',
  attemptNumber: 1,
  studentId: 'stu-2',
  studentName: 'Pham Quynh Anh',
  studentCode: 'SV26000002',
  submittedAt: '2026-11-14T11:30:00Z',
  score: null,
  comment: null,
  files: [],
  questionFile: null,
  examSubmission: {} as ExamGradingQueueItem['examSubmission'],
  ...overrides,
});

describe('grading-queue helpers', () => {
  it('parses URL params and defaults section to exam first', () => {
    expect(parseGradingTab(null)).toBe('PENDING');
    expect(parseGradingTab('graded')).toBe('GRADED');
    expect(parseGradingType(null)).toBe('exam');
    expect(parseGradingType('invalid')).toBe('exam');
    expect(parseGradingType('assignment')).toBe('assignment');
    expect(parseGradingSort(null)).toBe('newest');
    expect(parseGradingSort('oldest')).toBe('oldest');
  });

  it('filters strictly within the active section and sorts by submission time', () => {
    const items: GradingQueueItem[] = [
      assignmentItem({ queueId: 'assignment:1', submittedAt: '2026-11-14T08:00:00Z' }),
      assignmentItem({ queueId: 'assignment:2', submittedAt: '2026-11-14T09:00:00Z' }),
      examItem({ queueId: 'exam:1', submittedAt: '2026-11-14T11:30:00Z' }),
      examItem({
        queueId: 'exam:2',
        classId: 'class-1',
        studentName: 'Le Quoc Bao',
        studentCode: 'SV26000004',
        score: 8.5,
      }),
    ];

    const pendingExams = filterAndSortGradingQueue(items, {
      tab: 'PENDING',
      typeFilter: 'exam',
      classFilter: 'all',
      searchQuery: '',
      sortOrder: 'newest',
    });
    expect(pendingExams.map((i) => i.queueId)).toEqual(['exam:1']);

    const oldestAssignments = filterAndSortGradingQueue(items, {
      tab: 'PENDING',
      typeFilter: 'assignment',
      classFilter: 'all',
      searchQuery: '',
      sortOrder: 'oldest',
    });
    expect(oldestAssignments.map((i) => i.queueId)).toEqual([
      'assignment:1',
      'assignment:2',
    ]);

    const searchGradedExam = filterAndSortGradingQueue(items, {
      tab: 'GRADED',
      typeFilter: 'exam',
      classFilter: 'class-1',
      searchQuery: 'SV26000004',
      sortOrder: 'newest',
    });
    expect(searchGradedExam.map((i) => i.queueId)).toEqual(['exam:2']);
  });
});
