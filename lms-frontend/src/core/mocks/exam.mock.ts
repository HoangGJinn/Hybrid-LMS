import type { ExamSchedule, ExamSession } from '@features/exams';

export const mockExamSchedules: ExamSchedule[] = [
  {
    id: 'e1',
    classId: 'c1',
    examName: 'Midterm Exam',
    startTime: '2026-10-25T08:00:00Z',
    endTime: '2026-10-25T09:30:00Z',
  },
  {
    id: 'e2',
    classId: 'c2',
    examName: 'Quiz 2 — Memory Management',
    startTime: '2026-10-18T13:00:00Z',
    endTime: '2026-10-18T13:45:00Z',
  },
];

export const mockExamSessions: ExamSession[] = [];
