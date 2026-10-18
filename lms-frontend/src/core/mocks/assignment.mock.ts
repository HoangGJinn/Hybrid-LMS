import type { Assignment, AssignmentSubmission } from '@features/assignments';

export const mockAssignments: Assignment[] = [
  {
    id: 'a1',
    classId: 'c1',
    title: 'Requirements Specification',
    instruction: 'Write an SRS document for the given case study.',
    openAt: '2026-10-01T00:00:00Z',
    endAt: '2026-10-15T23:59:00Z',
    status: 'OPEN',
  },
  {
    id: 'a2',
    classId: 'c2',
    title: 'Process Scheduling Lab',
    instruction: 'Implement FCFS, SJF and Round Robin.',
    openAt: '2026-09-20T00:00:00Z',
    endAt: '2026-10-05T23:59:00Z',
    status: 'OVERDUE',
  },
  {
    id: 'a3',
    classId: 'c3',
    title: 'Binary Trees Exercise',
    instruction: 'Solve the 5 tree problems.',
    openAt: '2026-09-10T00:00:00Z',
    endAt: '2026-09-25T23:59:00Z',
    status: 'GRADED',
  },
  {
    id: 'a4',
    classId: 'c1',
    title: 'UML Class Diagram',
    instruction: 'Model the library system.',
    openAt: '2026-10-20T00:00:00Z',
    endAt: '2026-11-01T23:59:00Z',
    status: 'UPCOMING',
  },
];

export const mockSubmissions: AssignmentSubmission[] = [
  {
    id: 'sub1',
    assignmentId: 'a1',
    submittedBy: 'stu-002',
    studentName: 'Le Van E',
    score: null,
    comment: null,
    submittedAt: '2026-10-09T10:00:00Z',
    fileNames: ['srs_v1.pdf'],
  },
  {
    id: 'sub2',
    assignmentId: 'a1',
    submittedBy: 'stu-003',
    studentName: 'Pham Thi F',
    score: 8.5,
    comment: 'Good structure.',
    submittedAt: '2026-10-08T14:30:00Z',
    fileNames: ['srs.docx'],
  },
  {
    id: 'sub3',
    assignmentId: 'a3',
    submittedBy: 'stu-001',
    studentName: 'Nguyen Van A',
    score: 9,
    comment: 'Excellent work.',
    submittedAt: '2026-09-24T09:00:00Z',
    fileNames: ['trees.zip'],
  },
];
