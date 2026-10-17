import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationService } from '../api/notification.service'
import { notificationKeys } from '../api/queryKeys'

export const useNotifications = () =>
  useQuery({ queryKey: notificationKeys.all, queryFn: () => notificationService.getNotifications(), staleTime: 30_000 })

export const useUnreadCount = (): number => {
  const { data } = useNotifications()
  return data ? data.filter((n) => !n.isRead).length : 0
}

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}
