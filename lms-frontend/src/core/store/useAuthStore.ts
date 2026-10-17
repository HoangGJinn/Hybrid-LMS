import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { AuthUser, UserProfile } from '../types/auth.types'

const PROFILE_STORAGE_KEY = 'lms_user_profile'
const PROFILE_STORAGE_VERSION = 1

interface AuthState {
  /** Full user from the server. Memory only. */
  user: AuthUser | null
  /** Access token. Memory only: it is never written to any browser storage. */
  token: string | null
  /** Name, code and email. The only part that is persisted (localStorage), so it is readable instantly after a reload. */
  profile: UserProfile | null
  isAuthenticated: boolean
}

interface AuthActions {
  login: (user: AuthUser, token?: string) => void
  logout: () => void
  setUser: (user: AuthUser | null) => void
}

type AuthStore = AuthState & AuthActions

const toProfile = (user: AuthUser): UserProfile => ({ fullName: user.fullName, code: user.code, email: user.email })

// The refresh token lives in an httpOnly cookie (JS cannot read it); the access token lives only in this store.
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      profile: null,
      isAuthenticated: false,

      login: (user, token) => {
        set({ user, token: token ?? null, profile: toProfile(user), isAuthenticated: true })
      },

      logout: () => {
        set({ user: null, token: null, profile: null, isAuthenticated: false })
        useAuthStore.persist.clearStorage()
      },

      setUser: (user) => {
        if (!user) return get().logout()
        set({ user, profile: toProfile(user), isAuthenticated: true })
      },
    }),
    {
      name: PROFILE_STORAGE_KEY,
      version: PROFILE_STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ profile: state.profile }),
    },
  ),
)
