export interface KnowledgeComponent { id: string; name: string }

export interface KcMastery { id: string; kcId: string; kcName: string; pMastery: number; attemptsCount: number; lastUpdated: string; nextReviewAt: string | null }

export interface SubjectCompetency { id: string; subjectId: string; subjectName: string; abilityScore: number; quizzesTaken: number }
