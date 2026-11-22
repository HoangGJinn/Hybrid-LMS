import { apiClient } from '@core/api/client';
import { get } from '@core/api/http';
import type { Gradebook, GradebookParams } from '../types/gradebook.types';

export const gradebookService = {
  getGradebook: (
    classId: string,
    params: GradebookParams = {},
  ): Promise<Gradebook> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search?.trim()) query.set('search', params.search.trim());
    const qs = query.toString();
    return get(`/api/classes/${classId}/gradebook${qs ? `?${qs}` : ''}`);
  },
  /**
   * An Excel file with every student and every assignment / exam column of the class (no paging).
   * It goes through the app's HTTP client because a plain link would carry no login token.
   */
  exportGradebook: async (classId: string): Promise<Blob> => {
    const response = await apiClient.get<Blob>(
      `/api/classes/${classId}/gradebook/export`,
      { responseType: 'blob' },
    );
    return response.data;
  },
};