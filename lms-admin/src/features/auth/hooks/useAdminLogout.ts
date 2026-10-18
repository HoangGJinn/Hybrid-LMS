import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useAdminAuthStore } from '@/core/store/useAdminAuthStore';
import { authService } from '../api/auth.service';
import { authKeys } from '../api/queryKeys';

/** Signs out. The local session and the query cache are cleared even if the API call fails. */
export const useAdminLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const clearSession = useAdminAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      clearSession();
      queryClient.setQueryData(authKeys.session(), null);
      navigate('/login', { replace: true });
      // After navigation, so unmounting pages do not refetch what is being removed.
      setTimeout(() => {
        queryClient.removeQueries({
          predicate: (query) => query.queryKey[0] !== authKeys.all[0],
        });
      }, 0);
    },
  });
};
