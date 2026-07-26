'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Hydrates the auth store on mount by calling GET /auth/me.
 * The access token is refreshed automatically via the axios interceptor.
 * Call this once in the dashboard layout.
 */
export function useAuth() {
  const { user, isAuthenticated, isLoading, fetchMe } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      fetchMe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { user, isAuthenticated, isLoading }
}
