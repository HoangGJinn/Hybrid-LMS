import type { Difficulty } from '@features/quizzes';

export type GenerationJobStatus =
  'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface GenerationJob {
  id: string;
  classId: string;
  documentIds: string[];
  numQuestions: number;
  status: GenerationJobStatus;
  createdAt: string;
}

export interface GenerateQuizRequest {
  classId: string;
  documentIds: string[];
  numQuestions: number;
  difficulty: Difficulty;
}

export interface DraftQuestion {
  id: string;
  content: string;
  options: string[];
  correctIndex: number;
  kcId: string;
  kcName: string;
  difficulty: Difficulty;
  explanation: string;
}

export interface GenerateDraftRequest {
  classId: string;
  documentIds: string[];
  kcIds: string[];
  numQuestions: number;
  difficulty: Difficulty;
}

export type PublishTarget = 'QUIZ' | 'EXAM';
