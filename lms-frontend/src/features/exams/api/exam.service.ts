import { USE_MOCK } from '@core/config/env'
import { mockExamSchedules, mockQuizzes, delay } from '@core/mocks'
import type { ExamSchedule, ExamSession } from '../types/exams.types'
import type { QuizAnswer, QuizQuestion } from '@features/quizzes'
import { get, post } from '@core/api/http'

export const examService = {
  getUpcomingExams: (): Promise<ExamSchedule[]> => (USE_MOCK ? delay(mockExamSchedules) : get('/api/exams/upcoming')),
  getExam: (id: string): Promise<ExamSchedule | undefined> =>
    USE_MOCK ? delay(mockExamSchedules.find((e) => e.id === id)) : get(`/api/exams/${id}`),
  /** Questions are served without correct answers on the real backend. */
  getQuestions: (examScheduleId: string): Promise<QuizQuestion[]> =>
    USE_MOCK ? delay(mockQuizzes.flatMap((q) => q.questions)) : get(`/api/exams/${examScheduleId}/questions`),
  startSession: (examScheduleId: string): Promise<ExamSession> =>
    USE_MOCK
      ? delay({ id: crypto.randomUUID(), examScheduleId, studentId: 'stu-001', status: 'IN_PROGRESS', score: null, startedAt: new Date().toISOString(), endedAt: null })
      : post(`/api/exams/${examScheduleId}/sessions`),
  submitSession: (sessionId: string, answers: QuizAnswer[]): Promise<ExamSession> =>
    USE_MOCK
      ? delay({ id: sessionId, examScheduleId: '', studentId: 'stu-001', status: 'SUBMITTED', score: null, startedAt: '', endedAt: new Date().toISOString() }, 600)
      : post(`/api/exam-sessions/${sessionId}/submit`, { answers }),
}
