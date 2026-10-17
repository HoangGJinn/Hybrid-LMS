import type { KcMastery, SubjectCompetency } from '@features/mastery'
import type { LearningRoadmap } from '@features/roadmap'

export const mockKcMastery: KcMastery[] = [
  { id: 'm1', kcId: 'kc1', kcName: 'Requirements', pMastery: 0.72, attemptsCount: 6, lastUpdated: '2026-10-10T08:10:00Z', nextReviewAt: '2026-10-14T00:00:00Z' },
  { id: 'm2', kcId: 'kc2', kcName: 'Process Models', pMastery: 0.45, attemptsCount: 4, lastUpdated: '2026-10-09T08:10:00Z', nextReviewAt: '2026-10-12T00:00:00Z' },
  { id: 'm3', kcId: 'kc3', kcName: 'UML Modeling', pMastery: 0.28, attemptsCount: 2, lastUpdated: '2026-10-08T08:10:00Z', nextReviewAt: '2026-10-11T00:00:00Z' },
  { id: 'm4', kcId: 'kc4', kcName: 'Testing', pMastery: 0.6, attemptsCount: 3, lastUpdated: '2026-10-07T08:10:00Z', nextReviewAt: null },
  { id: 'm5', kcId: 'kc5', kcName: 'Design Patterns', pMastery: 0.15, attemptsCount: 1, lastUpdated: '2026-10-06T08:10:00Z', nextReviewAt: null },
]

export const mockCompetencies: SubjectCompetency[] = [
  { id: 'sc1', subjectId: 'sub-1', subjectName: 'Software Engineering', abilityScore: 68.5, quizzesTaken: 7 },
  { id: 'sc2', subjectId: 'sub-2', subjectName: 'Operating Systems', abilityScore: 54, quizzesTaken: 3 },
]

export const mockRoadmaps: LearningRoadmap[] = [
  { id: 'r1', subjectId: 'sub-1', title: 'Software Engineering Roadmap', createdAt: '2026-10-01T00:00:00Z', items: [
    { id: 'ri1', kcId: 'kc5', kcName: 'Design Patterns', reason: 'Lowest mastery in this subject.', priorityScore: 92, dueDate: '2026-10-14', status: 'PENDING' },
    { id: 'ri2', kcId: 'kc3', kcName: 'UML Modeling', reason: 'Required for the upcoming assignment.', priorityScore: 85, dueDate: '2026-10-18', status: 'IN_PROGRESS' },
    { id: 'ri3', kcId: 'kc1', kcName: 'Requirements', reason: null, priorityScore: 40, dueDate: null, status: 'COMPLETED' },
  ] },
]
