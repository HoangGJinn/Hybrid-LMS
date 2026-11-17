import { apiClient } from '@core/api/client';
import type { AxiosRequestConfig } from 'axios';
import { isAxiosError } from 'axios';
import type { ZaloLinkCode, ZaloStatus } from '../types/zalo.types';

// Tiền tố toàn cục của backend (xác nhận bằng curl: /api/zalo/status trả 401)
const API_PREFIX = '/api';

// Auth (token, refresh) do interceptor của apiClient lo, không tự đọc token ở đây nữa
async function request<T>(
  path: string,
  init: Pick<AxiosRequestConfig, 'method' | 'data'> = {},
): Promise<T> {
  try {
    const res = await apiClient.request({
      url: `${API_PREFIX}/zalo${path}`,
      ...init,
    });
    const json = res.data;
    if (json?.success === false) {
      throw new Error(json?.message ?? `HTTP ${res.status}`);
    }
    // ResponseInterceptor bọc dữ liệu trong { success, statusCode, data, timestamp }
    return (json?.data ?? json) as T;
  } catch (err) {
    if (isAxiosError(err)) {
      throw new Error(
        err.response?.data?.message ?? `HTTP ${err.response?.status ?? err.message}`,
        { cause: err },
      );
    }
    throw err;
  }
}

export const zaloApi = {
  status: () => request<ZaloStatus>('/status'),
  createCode: () => request<ZaloLinkCode>('/link-code', { method: 'POST' }),
  unlink: () => request<void>('/link', { method: 'DELETE' }),
};