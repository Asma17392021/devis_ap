'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Notification {
  id: string
  type: string
  message: string
  readAt: string | null
  createdAt: string
  quoteId: string
  quote: { id: string; number: string; title: string; status: string }
}

interface NotificationsResponse {
  data: { notifications: Notification[]; unreadCount: number }
}

export function useNotifications() {
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get<NotificationsResponse>('/notifications')
      return res.data.data
    },
    refetchInterval: 30_000, // Poll every 30s
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unreadCount ?? 0,
    markAllAsRead: markAllAsReadMutation.mutate,
    markAsRead: markAsReadMutation.mutate,
  }
}
