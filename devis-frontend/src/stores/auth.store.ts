'use client'

import { create } from 'zustand'
import { api, setAccessToken, clearAccessToken } from '@/lib/api'

export interface AuthUser {
  id: string
  email: string
  role: 'ADMIN' | 'MANAGER'
  firstName: string
  lastName: string
  preferredLang: string
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean

  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
  setUser: (user: AuthUser) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const { data } = await api.post<{ data: { accessToken: string; user: AuthUser } }>('/auth/login', {
        email,
        password,
      })
      setAccessToken(data.data.accessToken)
      set({ user: data.data.user, isAuthenticated: true })
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Ignore — clear local state regardless
    } finally {
      clearAccessToken()
      set({ user: null, isAuthenticated: false })
    }
  },

  fetchMe: async () => {
    set({ isLoading: true })
    try {
      const { data } = await api.get<{ data: AuthUser }>('/auth/me')
      set({ user: data.data, isAuthenticated: true })
    } catch {
      clearAccessToken()
      set({ user: null, isAuthenticated: false })
    } finally {
      set({ isLoading: false })
    }
  },

  setUser: (user) => set({ user, isAuthenticated: true }),
}))
