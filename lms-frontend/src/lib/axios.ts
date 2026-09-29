import axios from 'axios'
import { useAuthStore } from '../store/useAuthStore'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:9595',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add the auth token to headers
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
