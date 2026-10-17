import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { queryClient } from '@core/query/query-client'
import { useAuthStore } from '@core/store/useAuthStore'
import { refreshAccessToken } from './refresh-session'

const UNAUTHORIZED = 401
// A 401 from these routes is a real answer (bad login, dead refresh token), not an expired access token.
const AUTH_URLS_WITHOUT_REFRESH = ['/api/auth/google', '/api/auth/refresh', '/api/auth/logout']

interface RetriableRequest extends InternalAxiosRequestConfig {
  _retried?: boolean
}

const shouldRefresh = (error: AxiosError): boolean => {
  const request = error.config as RetriableRequest | undefined
  if (!request || request._retried || error.response?.status !== UNAUTHORIZED) return false
  return !AUTH_URLS_WITHOUT_REFRESH.some((url) => request.url?.includes(url))
}

/**
 * Adds auth behaviour to an axios client: attaches the in-memory Bearer token and,
 * on a 401, refreshes the session and replays the request once.
 * Call once before the app renders. Returns a function that removes both interceptors.
 */
export const setupAuthInterceptors = (client: AxiosInstance): (() => void) => {
  const requestId = client.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  // Access token expired: get a new one with the refresh cookie, then replay the request once.
  const responseId = client.interceptors.response.use(undefined, async (error: AxiosError) => {
    if (!shouldRefresh(error)) return Promise.reject(error)
    const request = error.config as RetriableRequest
    request._retried = true
    try {
      request.headers.Authorization = `Bearer ${await refreshAccessToken()}`
    } catch (refreshError) {
      // The refresh token is invalid, expired or revoked: the session is over.
      useAuthStore.getState().logout()
      queryClient.clear()
      return Promise.reject(refreshError)
    }
    return client(request)
  })

  return () => {
    client.interceptors.request.eject(requestId)
    client.interceptors.response.eject(responseId)
  }
}
