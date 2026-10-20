import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@core/store/useAuthStore';
import { authService } from '../api/auth.service';
import { authKeys } from '../api/queryKeys';

/** Exchanges a Google ID token for a session and stores it. */
export const useLoginWithGoogle = () => {
  const queryClient = useQueryClient();
  const setToken = useAuthStore((state) => state.setToken);
  return useMutation({
    mutationFn: (idToken: string) => authService.loginWithGoogle(idToken),
    onSuccess: ({ user, accessToken }) => {
      setToken(accessToken);
      queryClient.setQueryData(authKeys.me(), user);
    },
  });
};

/** Signs out. The local session and the whole query cache are cleared even if the API call fails. */
export const useLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const clearSession = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      // 1. Navigate to /login
      navigate('/login', { replace: true });

      // 2. Clear token in Zustand
      clearSession();

      setTimeout(() => {
        queryClient.clear();
      }, 0);
    },
  });
};
