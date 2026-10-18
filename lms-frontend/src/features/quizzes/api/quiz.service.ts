import { USE_MOCK } from '@core/config/env';
import { mockQuizzes, delay } from '@core/mocks';
import type { QuizAnswer, QuizInstance } from '../types/quizzes.types';
import { get, post } from '@core/api/http';

const SCORE_SCALE = 10;
const SCORE_PRECISION = 100;

export const quizService = {
  getMyQuizzes: (): Promise<QuizInstance[]> =>
    USE_MOCK ? delay(mockQuizzes) : get('/api/quizzes/me'),
  getQuiz: (id: string): Promise<QuizInstance | undefined> =>
    USE_MOCK
      ? delay(mockQuizzes.find((q) => q.id === id))
      : get(`/api/quizzes/${id}`),
  submit: (id: string, answers: QuizAnswer[]): Promise<QuizInstance> => {
    if (!USE_MOCK) return post(`/api/quizzes/${id}/submit`, { answers });
    const index = mockQuizzes.findIndex((q) => q.id === id);
    const quiz = mockQuizzes[index];
    const correct = answers.filter(
      (a) =>
        quiz.questions.find((q) => q.id === a.questionId)?.correctIndex ===
        a.selectedIndex,
    ).length;
    // Replace the object instead of mutating it, so cached copies of the old quiz are not silently changed.
    const graded: QuizInstance = {
      ...quiz,
      status: 'GRADED',
      score:
        Math.round(
          (correct / quiz.questions.length) * SCORE_SCALE * SCORE_PRECISION,
        ) / SCORE_PRECISION,
    };
    mockQuizzes[index] = graded;
    return delay({ ...graded }, 600);
  },
};
