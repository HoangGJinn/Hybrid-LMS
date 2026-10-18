import { USE_MOCK } from '@core/config/env';
import {
  mockGenerationJobs,
  mockKnowledgeComponents,
  delay,
} from '@core/mocks';
import type {
  DraftQuestion,
  GenerateDraftRequest,
  GenerateQuizRequest,
  GenerationJob,
  PublishTarget,
} from '../types/ai-generate.types';
import type { KnowledgeComponent } from '@features/mastery';
import { get, post } from '@core/api/http';

const sampleStems = [
  'Which statement best describes {kc}?',
  'What is the main purpose of {kc}?',
  'Which of the following is an example of {kc}?',
  'When applying {kc}, which step comes first?',
];

export const aiGenerateService = {
  getKnowledgeComponents: (
    documentIds: string[],
  ): Promise<KnowledgeComponent[]> =>
    USE_MOCK
      ? delay(documentIds.length ? mockKnowledgeComponents : [])
      : get('/api/knowledge-components', {
          documentIds: documentIds.join(','),
        }),

  generateDraft: (req: GenerateDraftRequest): Promise<DraftQuestion[]> => {
    if (!USE_MOCK) return post('/api/assessment-generation/drafts', req);
    const kcs = mockKnowledgeComponents.filter((k) => req.kcIds.includes(k.id));
    const drafts = Array.from({ length: req.numQuestions }, (_, i) => {
      const kc = kcs[i % kcs.length];
      return {
        id: crypto.randomUUID(),
        content: sampleStems[i % sampleStems.length].replace('{kc}', kc.name),
        options: [
          `Correct concept of ${kc.name}`,
          'A common misconception',
          'An unrelated definition',
          'A partially correct idea',
        ],
        correctIndex: 0,
        kcId: kc.id,
        kcName: kc.name,
        difficulty: req.difficulty,
        explanation: `Derived from the source material on ${kc.name}.`,
      };
    });
    return delay(drafts, 1500);
  },

  publish: (
    classId: string,
    title: string,
    target: PublishTarget,
    questions: DraftQuestion[],
  ): Promise<{ id: string }> =>
    USE_MOCK
      ? delay({ id: crypto.randomUUID() }, 700)
      : post('/api/assessment-generation/publish', {
          classId,
          title,
          target,
          questions,
        }),

  generate: (req: GenerateQuizRequest): Promise<GenerationJob> =>
    USE_MOCK
      ? delay(
          {
            id: crypto.randomUUID(),
            classId: req.classId,
            documentIds: req.documentIds,
            numQuestions: req.numQuestions,
            status: 'PROCESSING',
            createdAt: new Date().toISOString(),
          },
          800,
        )
      : post('/api/assessment-generation/jobs', req),

  getJobs: (classId: string): Promise<GenerationJob[]> =>
    USE_MOCK
      ? delay(mockGenerationJobs.filter((j) => j.classId === classId))
      : get('/api/assessment-generation/jobs', { classId }),
};
