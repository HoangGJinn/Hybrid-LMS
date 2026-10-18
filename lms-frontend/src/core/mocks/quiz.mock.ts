import type { GenerationJob } from '@features/ai-generate';
import type { QuizInstance } from '@features/quizzes';

export const mockQuizzes: QuizInstance[] = [
  {
    id: 'q1',
    generationJobId: 'job1',
    studentId: 'stu-001',
    title: 'Adaptive Quiz — Requirements',
    targetDifficulty: 'MEDIUM',
    numQuestions: 3,
    status: 'CREATED',
    score: null,
    createdAt: '2026-10-10T08:00:00Z',
    questions: [
      {
        id: 'qq1',
        content: 'Which document captures functional requirements?',
        options: ['SRS', 'UML', 'Gantt chart', 'Test plan'],
        correctIndex: 0,
        kcId: 'kc1',
        explanation: 'The SRS describes what the system must do.',
      },
      {
        id: 'qq2',
        content: 'A non-functional requirement describes…',
        options: ['A feature', 'A quality attribute', 'A use case', 'A bug'],
        correctIndex: 1,
        kcId: 'kc1',
        explanation: 'NFRs describe qualities such as performance.',
      },
      {
        id: 'qq3',
        content: 'Which model is iterative?',
        options: ['Waterfall', 'V-Model', 'Spiral', 'None'],
        correctIndex: 2,
        kcId: 'kc2',
        explanation: 'Spiral iterates through risk-driven cycles.',
      },
    ],
  },
];

export const mockGenerationJobs: GenerationJob[] = [
  {
    id: 'job1',
    classId: 'c1',
    documentIds: ['d2'],
    numQuestions: 3,
    status: 'COMPLETED',
    createdAt: '2026-10-10T07:55:00Z',
  },
];
