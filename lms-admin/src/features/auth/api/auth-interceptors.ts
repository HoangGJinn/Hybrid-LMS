import type {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import { queryClient } from '@/core/query/query-client';
import { useAdminAuthStore } from '@/core/store/useAdminAuthStore';
import { refreshAccessToken } from './refresh-session';
import { authKeys } from './queryKeys';

const UNAUTHORIZED = 401;
// A 401 from these routes is a real answer (bad login, dead refresh token), not an expired access token.
const AUTH_URLS_WITHOUT_REFRESH = [
  '/api/auth/google',
  '/api/auth/refresh',
  '/api/auth/logout',
];

interface RetriableRequest extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

const shouldRefresh = (error: AxiosError): boolean => {
  const request = error.config as RetriableRequest | undefined;
  if (!request || request._retried || error.response?.status !== UNAUTHORIZED)
    return false;
  return !AUTH_URLS_WITHOUT_REFRESH.some((url) => request.url?.includes(url));
};

/** The refresh token is dead: drop the session so <ProtectedRoute /> sends the user to /login. */
const endSession = () => {
  useAdminAuthStore.getState().logout();
  queryClient.setQueryData(authKeys.session(), null);
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== authKeys.all[0],
  });
};

/**
 * Adds auth behaviour to an axios client: attaches the in-memory Bearer token and,
 * on a 401, refreshes the session and replays the request once.
 * Call once before the app renders. Returns a function that removes both interceptors.
 */
export const setupAuthInterceptors = (client: AxiosInstance): (() => void) => {
  const requestId = client.interceptors.request.use((config) => {
    const token = useAdminAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  const responseId = client.interceptors.response.use(
    undefined,
    async (error: AxiosError) => {
      if (!shouldRefresh(error)) return Promise.reject(error);
      const request = error.config as RetriableRequest;
      request._retried = true;
      try {
        request.headers.Authorization = `Bearer ${await refreshAccessToken()}`;
      } catch (refreshError) {
        endSession();
        return Promise.reject(refreshError);
      }
      return client(request);
    },
  );

  return () => {
    client.interceptors.request.eject(requestId);
    client.interceptors.response.eject(responseId);
  };
};
