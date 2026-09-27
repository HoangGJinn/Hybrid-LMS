import { create } from 'zustand'

// Per our TypeScript Skill: define explicit state and action interfaces
interface AuthUser {
  id: string
  email: string
  fullName: string
  role: 'STUDENT' | 'TEACHER' | 'ADMIN'
  username: string
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
}

interface AuthActions {
  login: (user: AuthUser, token: string) => void
  logout: () => Promise<void>
  checkAuth: () => void
}

type AuthStore = AuthState & AuthActions

// Per our Zustand Skill: model each store as state + named actions
// Keep stores small and domain-focused (auth session state)
export const useAuthStore = create<AuthStore>()((set) => ({
  // State
  user: null,
  token: null,
  isAuthenticated: false,

  // Actions
  login: (user, token) => {
    localStorage.setItem('lms_token', token)
    set({ user, token, isAuthenticated: true })
  },

  logout: async () => {
    const token = localStorage.getItem('lms_token')
    if (token) {
      try {
        const BACKEND_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:9595'
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      } catch (error) {
        console.error('Lỗi khi gọi API đăng xuất:', error)
      }
    }
    localStorage.removeItem('lms_token')
    set({ user: null, token: null, isAuthenticated: false })
  },

  // Hydration from localStorage on app load
  checkAuth: () => {
    const token = localStorage.getItem('lms_token')
    if (token) {
      // Note: In production, verify token validity with backend before setting
      set({ token, isAuthenticated: true })
    }
  },
}))
