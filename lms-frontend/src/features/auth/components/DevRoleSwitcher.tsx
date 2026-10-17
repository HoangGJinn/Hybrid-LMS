import { useQueryClient } from '@tanstack/react-query'
import { mockLecturer, mockStudent } from '@core/mocks/users.mock'
import { cn } from '@shared/utils/cn'
import { authKeys } from '../api/queryKeys'
import { useAuthStore } from '@core/store/useAuthStore'
import type { UserRole } from '@core/types/auth.types'

const DEV_MOCK_TOKEN = 'dev-mock-token'
const SWITCHABLE_ROLES = ['STUDENT', 'LECTURER'] as const

type SwitchableRole = (typeof SWITCHABLE_ROLES)[number]

const mockUserByRole = { STUDENT: mockStudent, LECTURER: mockLecturer } as const

interface DevRoleSwitcherProps {
  role: UserRole
  /** Called after the session has been switched, e.g. to close a menu or navigate to the new home. */
  onSwitched?: (role: SwitchableRole) => void
}

/** Development-only helper to sign in as a mock student or lecturer. Renders nothing in production builds. */
export const DevRoleSwitcher = ({ role, onSwitched }: DevRoleSwitcherProps) => {
  const queryClient = useQueryClient()
  const login = useAuthStore((state) => state.login)

  if (!import.meta.env.DEV) return null

  const handleSwitch = (next: SwitchableRole) => {
    const nextUser = mockUserByRole[next]
    login(nextUser, DEV_MOCK_TOKEN)
    queryClient.setQueryData(authKeys.me(), nextUser)
    onSwitched?.(next)
  }

  return (
    <div className="m-3 rounded-xl bg-white/40 p-3 text-xs dark:bg-white/10">
      <p className="m-0 mb-2 font-medium">Dev: switch role</p>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-white/50 p-1 dark:bg-white/10">
        {SWITCHABLE_ROLES.map((switchableRole) => (
          <button
            key={switchableRole}
            type="button"
            onClick={() => handleSwitch(switchableRole)}
            aria-pressed={role === switchableRole}
            className={cn('rounded-md px-2 py-1.5 font-medium transition-colors', role === switchableRole ? 'bg-card text-brand shadow-sm' : 'hover:bg-white/60 dark:hover:bg-white/10')}
          >
            {switchableRole === 'STUDENT' ? 'Student' : 'Lecturer'}
          </button>
        ))}
      </div>
    </div>
  )
}
