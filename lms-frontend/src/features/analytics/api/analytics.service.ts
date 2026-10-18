import { USE_MOCK } from '@core/config/env';
import { mockAnalytics, delay } from '@core/mocks';
import type { ClassAnalytics } from '../types/analytics.types';
import { get } from '@core/api/http';

export const analyticsService = {
  getAnalytics: (classId: string): Promise<ClassAnalytics | undefined> =>
    USE_MOCK
      ? delay(mockAnalytics.find((a) => a.classId === classId))
      : get(`/api/classes/${classId}/analytics`),
};
