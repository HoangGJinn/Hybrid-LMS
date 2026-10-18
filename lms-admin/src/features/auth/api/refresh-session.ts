import axios from 'axios';
import { API_BASE_URL } from '@/core/config/env';
import { useAdminAuthStore } from '@/core/store/useAdminAuthStore';
import type { SessionUser } from '@/core/types/auth.types';

interface RefreshResponse {
  data: { accessToken: string; user: SessionUser };
}

// Plain client without interceptors: a failed refresh must never trigger another refresh.
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let pendingRefresh: Promise<string> | null = null;

const requestNewSession = async (): Promise<string> => {
  const { data } =
    await refreshClient.post<RefreshResponse>('/api/auth/refresh');
  const { accessToken, user } = data.data;
  useAdminAuthStore.getState().login(user, accessToken);
  return accessToken;
};

/**
 * Exchanges the httpOnly refresh cookie for a new access token (kept in the store) and returns it.
 * Parallel callers share one request, because each refresh token can be used only once.
 */
export const refreshAccessToken = (): Promise<string> => {
  pendingRefresh ??= requestNewSession().finally(() => {
    pendingRefresh = null;
  });
  return pendingRefresh;
};
