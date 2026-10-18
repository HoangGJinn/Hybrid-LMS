import { USE_MOCK } from '@core/config/env';
import { mockCompetencies, mockKcMastery, delay } from '@core/mocks';
import type { KcMastery, SubjectCompetency } from '../types/mastery.types';
import { get } from '@core/api/http';

export const masteryService = {
  getKcMastery: (): Promise<KcMastery[]> =>
    USE_MOCK ? delay(mockKcMastery) : get('/api/mastery/kc/me'),
  getCompetencies: (): Promise<SubjectCompetency[]> =>
    USE_MOCK ? delay(mockCompetencies) : get('/api/mastery/competency/me'),
};
