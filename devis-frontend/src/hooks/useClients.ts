'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Client {
  id: string
  name: string
  email: string
  phone?: string | null
  address?: string | null
  city?: string | null
  postalCode?: string | null
  country: string
  siret?: string | null
  vatNumber?: string | null
  createdAt: string
}

interface PaginatedClients {
  data: Client[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export function useClients(search?: string, page = 1) {
  const params = new URLSearchParams({ page: String(page), limit: '20' })
  if (search) params.set('search', search)

  return useQuery({
    queryKey: ['clients', search, page],
    queryFn: async () => {
      const res = await api.get<{ data: PaginatedClients }>(`/clients?${params}`)
      return res.data.data
    },
  })
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: async () => {
      const res = await api.get<{ data: Client }>(`/clients/${id}`)
      return res.data.data
    },
    enabled: !!id,
  })
}

// Flat list for select dropdowns (no pagination)
export function useClientsSelect() {
  return useQuery({
    queryKey: ['clients', 'select'],
    queryFn: async () => {
      const res = await api.get<{ data: PaginatedClients }>('/clients?limit=100')
      return res.data.data.data
    },
    staleTime: 60_000,
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => api.post<{ data: Client }>('/clients', data).then(r => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  })
}

export function useUpdateClient(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => api.patch<{ data: Client }>(`/clients/${id}`, data).then(r => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  })
}
