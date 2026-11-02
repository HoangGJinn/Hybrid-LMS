import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminAuthStore } from '@/core/store/useAdminAuthStore';
import { NotAdminError, authService } from '../api/auth.service';
import { authKeys } from '../api/queryKeys';

/**
 * Authenticates an administrator with username/email and password.
 * Only administrators are let in: for any other role the server session is revoked and NotAdminError thrown.
 */
export const useAdminPasswordLogin = () => {
  const queryClient = useQueryClient();
  const setAccessToken = useAdminAuthStore((state) => state.setAccessToken);

  return useMutation({
    mutationFn: async ({
      username,
      password,
    }: {
      username: string;
      password: string;
    }) => {
      const session = await authService.login(username, password);
      if (session.user.role !== 'ADMIN') {
        await authService.logout().catch(() => undefined);
        throw new NotAdminError();
      }
      return session;
    },
    onSuccess: ({ user, accessToken }) => {
      setAccessToken(accessToken);
      queryClient.setQueryData(authKeys.session(), user);
    },
  });
};

/**
 * Exchanges a Google ID token for a session. Only administrators are let in: for any other role the
 * server session is revoked right away and `NotAdminError` is thrown, so nothing is stored.
 */
export const useAdminLogin = () => {
  const queryClient = useQueryClient();
  const setAccessToken = useAdminAuthStore((state) => state.setAccessToken);

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
      setAccessToken(accessToken);
      queryClient.setQueryData(authKeys.session(), user);
    },
  });
};
