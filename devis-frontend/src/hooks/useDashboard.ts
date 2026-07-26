'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface DashboardStats {
  quotesThisMonth: number
  pendingQuotes: number
  signedRevenueThisMonth: number
  acceptanceRate: number
  recentQuotes: {
    id: string
    number: string
    status: string
    client: { id: string; name: string }
    totalTTC: number
    issueDate: string
    expiryDate: string
  }[]
  expiringQuotes: {
    id: string
    number: string
    client: { id: string; name: string }
    totalTTC: number
    expiryDate: string
  }[]
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const res = await api.get<{ data: DashboardStats }>('/dashboard/stats')
      return res.data.data
    },
    refetchInterval: 30_000,
  })
}
