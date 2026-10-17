import { USE_MOCK } from '@core/config/env'
import { mockNotifications, delay } from '@core/mocks'
import type { AppNotification } from '../types/notifications.types'
import { get, patch } from '@core/api/http'

export const notificationService = {
  // Returns a copy so TanStack Query sees a new reference after the mock is mutated in place.
  getNotifications: (): Promise<AppNotification[]> => (USE_MOCK ? delay(structuredClone(mockNotifications)) : get('/api/notifications/me')),
  markRead: (id: string): Promise<void> => {
    if (!USE_MOCK) return patch(`/api/notifications/${id}/read`)
    const n = mockNotifications.find((x) => x.id === id)
    if (n) n.isRead = true
    return delay(undefined)
  },
  markAllRead: (): Promise<void> => {
    if (!USE_MOCK) return patch('/api/notifications/read-all')
    mockNotifications.forEach((n) => { n.isRead = true })
    return delay(undefined)
  },
}
