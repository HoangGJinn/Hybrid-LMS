// Global Types for Frontend
// These must stay in sync with the backend UserView type

export type UserRole = 'STUDENT' | 'LECTURER' | 'ADMIN'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  ssoId: string
  ssoProvider: string
  avatarUrl: string | null
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}
