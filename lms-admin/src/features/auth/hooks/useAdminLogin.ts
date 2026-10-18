import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminAuthStore } from '@/core/store/useAdminAuthStore';
import { NotAdminError, authService } from '../api/auth.service';
import { authKeys } from '../api/queryKeys';

/**
 * Exchanges a Google ID token for a session. Only administrators are let in: for any other role the
 * server session is revoked right away and `NotAdminError` is thrown, so nothing is stored.
 */
export const useAdminLogin = () => {
  const queryClient = useQueryClient();
  const login = useAdminAuthStore((state) => state.login);

  return useMutation({
    mutationFn: async (idToken: string) => {
      const session = await authService.loginWithGoogle(idToken);
      if (session.user.role !== 'ADMIN') {
        await authService.logout().catch(() => undefined);
        throw new NotAdminError();
      }
      return session;
    },
    onSuccess: ({ user, accessToken }) => {
      login(user, accessToken);
      queryClient.setQueryData(authKeys.session(), user);
    },
  });
};
