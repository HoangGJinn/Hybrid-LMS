import { Navigate } from 'react-router'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useAuthStore } from '@core/store/useAuthStore'
import type { UserRole } from '@core/types/auth.types'

const DEFAULT_ROLE: UserRole = 'STUDENT'

interface RoleRedirectProps {
  /** Landing route for each role. Owned by the app's navigation config, so it is passed in. */
  homeByRole: Record<UserRole, string>
}

/** Sends the signed-in user to the home route of their role. */
export const RoleRedirect = ({ homeByRole }: RoleRedirectProps) => {
  const { data: user } = useCurrentUser()
  const storeRole = useAuthStore((state) => state.user?.role)
  const role = user?.role ?? storeRole ?? DEFAULT_ROLE
  return <Navigate to={homeByRole[role]} replace />
}
