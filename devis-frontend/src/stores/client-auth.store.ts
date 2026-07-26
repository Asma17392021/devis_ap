'use client'

import { create } from 'zustand'
import { clientApi, setClientAccessToken, clearClientAccessToken } from '@/lib/client-api'

export interface ClientUser {
  id: string
  email: string
  firstName: string
  lastName: string
  clientId: string
  clientName: string
}

interface ClientAuthState {
  user: ClientUser | null
  isAuthenticated: boolean
  isLoading: boolean

  login: (email: string, password: string) => Promise<void>
  register: (data: {
    firstName: string
    lastName: string
    email: string
    password: string
    phone?: string
    company?: string
  }) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
}

export const useClientAuthStore = create<ClientAuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const { data } = await clientApi.post<{ data: { accessToken: string; account: ClientUser } }>(
        '/client-auth/login',
        { email, password }
      )
      setClientAccessToken(data.data.accessToken)
      set({ user: data.data.account, isAuthenticated: true })
    } finally {
      set({ isLoading: false })
    }
  },

  register: async (formData) => {
    set({ isLoading: true })
    try {
      const { data } = await clientApi.post<{ data: { accessToken: string; account: ClientUser } }>(
        '/client-auth/register',
        formData
      )
      setClientAccessToken(data.data.accessToken)
      set({ user: data.data.account, isAuthenticated: true })
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    try {
      await clientApi.post('/client-auth/logout')
    } catch {
      // ignore
    } finally {
      clearClientAccessToken()
      set({ user: null, isAuthenticated: false })
    }
  },

  fetchMe: async () => {
    set({ isLoading: true })
    try {
      const { data } = await clientApi.get<{ data: ClientUser & { client: { name: string } } }>(
        '/client-auth/me'
      )
      const me = data.data
      set({
        user: {
          id: me.id,
          email: me.email,
          firstName: me.firstName,
          lastName: me.lastName,
          clientId: me.clientId,
          clientName: (me as any).client?.name ?? '',
        },
        isAuthenticated: true,
      })
    } catch {
      clearClientAccessToken()
      set({ user: null, isAuthenticated: false })
    } finally {
      set({ isLoading: false })
    }
  },
}))
