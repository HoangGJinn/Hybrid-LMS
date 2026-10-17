export type QuizInstanceStatus = 'CREATED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED'
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'

export interface QuizQuestion { id: string; content: string; options: string[]; correctIndex: number; kcId: string; explanation: string }

export interface QuizInstance {
  id: string
  generationJobId: string
  studentId: string
  title: string
  targetDifficulty: Difficulty
  numQuestions: number
  status: QuizInstanceStatus
  score: number | null
  createdAt: string
  questions: QuizQuestion[]
}

export interface QuizAnswer { questionId: string; selectedIndex: number }
