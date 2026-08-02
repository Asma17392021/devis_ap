'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Bell, Globe } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'

type SearchResult = { id: string; number: string; title: string; status: string; client: { name: string } }

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon', SENT: 'Envoyé', ACCEPTED: 'Accepté', REFUSED: 'Refusé', EXPIRED: 'Expiré',
}
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REFUSED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
}

export function Header() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { notifications, unreadCount, markAllAsRead } = useNotifications()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)

  // Debounced search
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = useCallback((value: string) => {
    setQuery(value)
    if (debounceTimer) clearTimeout(debounceTimer)

    if (value.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await api.get<{ data: { data: SearchResult[] } }>(`/quotes?search=${encodeURIComponent(value)}&limit=5`)
        setResults(data.data.data ?? [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    setDebounceTimer(timer)
  }, [debounceTimer])

  const handleSelectResult = (id: string) => {
    setQuery('')
    setResults([])
    setShowSearch(false)
    router.push(`/quotes/${id}`)
  }

  // Language switcher
  const switchLang = async (lang: string) => {
    try {
      await api.patch('/auth/me', { preferredLang: lang })
    } catch {}
    document.cookie = `NEXT_LOCALE=${lang};path=/;max-age=31536000`
    window.location.reload()
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
            placeholder="Rechercher un devis, client..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition"
          />
        </div>

        {/* Search dropdown */}
        {showSearch && (query.length >= 2) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
            {searching && (
              <div className="px-4 py-3 text-sm text-gray-400">Recherche...</div>
            )}
            {!searching && results.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-400">Aucun résultat</div>
            )}
            {!searching && results.map((r) => (
              <button
                key={r.id}
                onMouseDown={() => handleSelectResult(r.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{r.number} — {r.title}</p>
                  <p className="text-xs text-gray-400">{r.client.name}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status]}`}>
                  {STATUS_LABELS[r.status]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Language switcher */}
        <div className="relative group">
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <Globe className="w-4 h-4" />
            <span>{user?.preferredLang?.toUpperCase() ?? 'FR'}</span>
          </button>
          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 hidden group-hover:block">
            {['fr', 'en'].map((lang) => (
              <button
                key={lang}
                onClick={() => switchLang(lang)}
                className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-50 transition"
              >
                {lang === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative flex items-center justify-center w-9 h-9 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">Notifications</p>
                {unreadCount > 0 && (
                  <button onClick={() => markAllAsRead()} className="text-xs text-blue-600 hover:underline">
                    Tout marquer lu
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 && (
                  <p className="px-4 py-6 text-sm text-gray-400 text-center">Aucune notification</p>
                )}
                {notifications.slice(0, 10).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { router.push(n.quoteId ? `/quotes/${n.quoteId}` : '/requests'); setShowNotifs(false) }}
                    className={`w-full flex gap-3 px-4 py-3 hover:bg-gray-50 transition text-left border-b border-gray-50 ${!n.readAt ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${!n.readAt ? 'bg-blue-500' : 'bg-gray-200'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(n.createdAt)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
