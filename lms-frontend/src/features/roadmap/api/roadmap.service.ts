import { USE_MOCK } from '@core/config/env';
import { mockRoadmaps, delay } from '@core/mocks';
import type { LearningRoadmap } from '../types/roadmap.types';
import { get } from '@core/api/http';

export const roadmapService = {
  getRoadmaps: (): Promise<LearningRoadmap[]> =>
    USE_MOCK ? delay(mockRoadmaps) : get('/api/roadmaps/me'),
};
