'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface QuoteLine {
  id: string
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
  discount?: number | null
  discountType?: 'PERCENTAGE' | 'FIXED' | null
  position: number
}

export interface Quote {
  id: string
  number: string
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REFUSED' | 'EXPIRED'
  title: string
  notes?: string | null
  termsAndConditions?: string | null
  issueDate: string
  expiryDate: string
  discount?: number | null
  discountType?: 'PERCENTAGE' | 'FIXED' | null
  pdfUrl?: string | null
  signedAt?: string | null
  client: { id: string; name: string; email: string }
  createdBy: { id: string; firstName: string; lastName: string }
  lines: QuoteLine[]
  totals: {
    subtotalHT: number
    globalDiscountAmount: number
    totalHT: number
    vatByRate: Record<string, number>
    totalTVA: number
    totalTTC: number
  }
  createdAt: string
  updatedAt: string
}

interface PaginatedQuotes {
  data: Quote[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

interface QuoteFilters {
  status?: string
  clientId?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export function useQuotes(filters: QuoteFilters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.set(k, String(v)) })

  return useQuery({
    queryKey: ['quotes', filters],
    queryFn: async () => {
      const res = await api.get<{ data: PaginatedQuotes }>(`/quotes?${params}`)
      return res.data.data
    },
  })
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: ['quotes', id],
    queryFn: async () => {
      const res = await api.get<{ data: Quote }>(`/quotes/${id}`)
      return res.data.data
    },
    enabled: !!id,
  })
}

export function useCreateQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => api.post<{ data: Quote }>('/quotes', data).then(r => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  })
}

export function useUpdateQuote(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => api.patch<{ data: Quote }>(`/quotes/${id}`, data).then(r => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', id] })
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
    },
  })
}

export function useSendQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<{ data: Quote }>(`/quotes/${id}/send`).then(r => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  })
}

export function useDeleteQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/quotes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  })
}
