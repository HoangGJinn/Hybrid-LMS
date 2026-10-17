export type NotificationType = 'ASSIGNMENT' | 'EXAM' | 'GRADE' | 'QUIZ' | 'SYSTEM'

export interface AppNotification { id: string; type: NotificationType; title: string; message: string; isRead: boolean; createdAt: string; /** Optional in-app link opened from the notification. */ href?: string }
