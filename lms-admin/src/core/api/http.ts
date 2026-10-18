import { apiClient } from './client';

// Backend wraps every response as { success, statusCode, message, data, timestamp } (ResponseInterceptor).
export const get = async <T>(url: string, params?: object): Promise<T> =>
  (await apiClient.get(url, { params })).data.data;
export const post = async <T>(url: string, body?: unknown): Promise<T> =>
  (await apiClient.post(url, body)).data.data;
export const patch = async <T>(url: string, body?: unknown): Promise<T> =>
  (await apiClient.patch(url, body)).data.data;
