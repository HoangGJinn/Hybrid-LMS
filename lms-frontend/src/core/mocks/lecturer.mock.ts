import type { ClassAnalytics } from '@features/analytics';
import type { KnowledgeComponent } from '@features/mastery';
import type { RosterStudent } from '@features/participants';

export const mockKnowledgeComponents: KnowledgeComponent[] = [
  { id: 'kc1', name: 'Requirements' },
  { id: 'kc2', name: 'Process Models' },
  { id: 'kc3', name: 'UML Modeling' },
  { id: 'kc4', name: 'Testing' },
  { id: 'kc5', name: 'Design Patterns' },
];

const names = [
  'Nguyen Van A',
  'Le Van E',
  'Pham Thi F',
  'Tran Minh G',
  'Hoang Thi H',
  'Vo Van I',
  'Dang Thi K',
  'Bui Van L',
];

export const mockRoster: RosterStudent[] = ['c1', 'c3'].flatMap((classId, ci) =>
  names.map((fullName, i) => {
    const avgMastery = Math.round(((i * 37 + ci * 13) % 90) + 10) / 100;
    return {
      id: `${classId}-stu-${i + 1}`,
      classId,
      studentCode: `2252${ci}${String(i + 1).padStart(3, '0')}`,
      fullName,
      email: `${fullName.toLowerCase().replace(/ /g, '.')}@university.edu`,
      avgScore: i === 5 ? null : Math.round((avgMastery * 8 + 2) * 10) / 10,
      avgMastery,
      submissionsDone: (i % 4) + 1,
      submissionsTotal: 4,
      atRisk: avgMastery < 0.35,
    };
  }),
);

export const mockAnalytics: ClassAnalytics[] = [
  {
    classId: 'c1',
    avgScore: 7.2,
    completionRate: 68,
    scoreDistribution: [
      { range: '0–4', count: 4 },
      { range: '4–6', count: 9 },
      { range: '6–8', count: 21 },
      { range: '8–10', count: 14 },
    ],
    kcStats: [
      { kcId: 'kc1', kcName: 'Requirements', avgMastery: 0.71 },
      { kcId: 'kc2', kcName: 'Process Models', avgMastery: 0.58 },
      { kcId: 'kc3', kcName: 'UML Modeling', avgMastery: 0.42 },
      { kcId: 'kc4', kcName: 'Testing', avgMastery: 0.55 },
      { kcId: 'kc5', kcName: 'Design Patterns', avgMastery: 0.29 },
    ],
    weeklyActivity: [
      { week: 'W1', active: 44 },
      { week: 'W2', active: 41 },
      { week: 'W3', active: 37 },
      { week: 'W4', active: 39 },
      { week: 'W5', active: 33 },
      { week: 'W6', active: 36 },
    ],
  },
  {
    classId: 'c3',
    avgScore: 7.9,
    completionRate: 81,
    scoreDistribution: [
      { range: '0–4', count: 2 },
      { range: '4–6', count: 8 },
      { range: '6–8', count: 26 },
      { range: '8–10', count: 24 },
    ],
    kcStats: [
      { kcId: 'kc1', kcName: 'Arrays', avgMastery: 0.82 },
      { kcId: 'kc2', kcName: 'Trees', avgMastery: 0.64 },
      { kcId: 'kc3', kcName: 'Graphs', avgMastery: 0.47 },
      { kcId: 'kc4', kcName: 'Sorting', avgMastery: 0.76 },
    ],
    weeklyActivity: [
      { week: 'W1', active: 58 },
      { week: 'W2', active: 55 },
      { week: 'W3', active: 52 },
      { week: 'W4', active: 54 },
      { week: 'W5', active: 49 },
      { week: 'W6', active: 51 },
    ],
  },
];
