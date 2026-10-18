import axios from 'axios';
import { API_BASE_URL } from '@/core/config/env';

/** Plain axios instance. It knows nothing about auth: `setupAuthInterceptors` (features/auth) adds that. */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});
