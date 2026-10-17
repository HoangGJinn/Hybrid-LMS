import type { AppNotification } from '@features/notifications'

export const mockNotifications: AppNotification[] = [
  { id: 'n1', type: 'GRADE', title: 'Assignment graded', message: 'Binary Trees Exercise: 9.0/10', isRead: false, createdAt: '2026-10-10T09:00:00Z', href: '/student/courses/c3/assignments/a3' },
  { id: 'n2', type: 'EXAM', title: 'Upcoming exam', message: 'Midterm Exam on Oct 25, 08:00', isRead: false, createdAt: '2026-10-09T09:00:00Z', href: '/student/exams' },
  { id: 'n3', type: 'QUIZ', title: 'New adaptive quiz', message: 'A quiz on Requirements is ready.', isRead: true, createdAt: '2026-10-08T09:00:00Z', href: '/student/courses/c1/quizzes/q1' },
  { id: 'n4', type: 'ASSIGNMENT', title: 'New assignment', message: 'UML Class Diagram opens on Oct 20.', isRead: false, createdAt: '2026-10-07T09:00:00Z', href: '/student/courses/c1/assignments/a4' },
  { id: 'n5', type: 'SYSTEM', title: 'Welcome to Hybrid LMS', message: 'Explore your courses, calendar and mastery map.', isRead: true, createdAt: '2026-10-01T09:00:00Z' },
]
