import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@core/store/useAuthStore'
import { authService } from '../api/auth.service'
import { authKeys } from '../api/queryKeys'

/** Exchanges a Google ID token for a session and stores it. */
export const useLoginWithGoogle = () => {
  const queryClient = useQueryClient()
  const login = useAuthStore((state) => state.login)
  return useMutation({
    mutationFn: (idToken: string) => authService.loginWithGoogle(idToken),
    onSuccess: ({ user, accessToken }) => {
      login(user, accessToken)
      queryClient.setQueryData(authKeys.me(), user)
    },
  })
}

/** Signs out. The local session and the whole query cache are cleared even if the API call fails. */
export const useLogout = () => {
  const queryClient = useQueryClient()
  const clearSession = useAuthStore((state) => state.logout)
  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      clearSession()
      queryClient.setQueryData(authKeys.me(), null)
      queryClient.clear()
    },
  })
}
