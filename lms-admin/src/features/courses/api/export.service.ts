import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import type { RosterExportParams } from '../types/courses.types';

/**
 * With `responseType: 'blob'` an error body arrives as a Blob too, so the backend's message
 * (for example "Choose a semester") has to be read out of it before the error is shown.
 */
const unwrapBlobError = async (error: unknown): Promise<never> => {
  if (isAxiosError(error) && error.response?.data instanceof Blob) {
    try {
      const body: unknown = JSON.parse(await error.response.data.text());
      error.response.data = body;
    } catch {
      // Not JSON: leave the error as it is.
    }
  }
  throw error;
};

const download = async (
  url: string,
  params?: Record<string, string | undefined>,
): Promise<Blob> => {
  try {
    const response = await apiClient.get<Blob>(url, {
      params,
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    return unwrapBlobError(error);
  }
};

export const exportService = {
  /** Classes and their students, in the layout of the import template. */
  exportClassRosters: ({ semesterId, status }: RosterExportParams): Promise<Blob> =>
    download('/api/exports/class-rosters', { semesterId, status }),

  /** Subject, semester and lecturer codes for filling in the import templates. */
  exportReferenceCodes: (): Promise<Blob> =>
    download('/api/exports/reference-codes'),
};
