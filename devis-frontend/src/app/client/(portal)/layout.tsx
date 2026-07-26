'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { FileText, ClipboardList, LogOut, User, Bell, X, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useClientAuthStore } from '@/stores/client-auth.store'
import { clientApi } from '@/lib/client-api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientNotification {
  id: string
  type: string
  message: string
  readAt: string | null
  createdAt: string
}

function NotifIcon({ type }: { type: string }) {
  if (type === 'REQUEST_REJECTED') return <XCircle className="w-4 h-4 text-red-500 shrink-0" />
  if (type === 'REQUEST_COMPLETED') return <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
  return <Loader2 className="w-4 h-4 text-blue-500 shrink-0" />
}

function formatTimeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs}h`
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

// ─── Notifications dropdown ───────────────────────────────────────────────────

function NotificationsDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { data } = useQuery<{ notifications: ClientNotification[]; unreadCount: number }>({
    queryKey: ['client-notifications'],
    queryFn: async () => {
      const res = await clientApi.get('/client-portal/notifications')
      return res.data.data
    },
    refetchInterval: 30_000,
  })

  const markAllRead = useMutation({
    mutationFn: async () => clientApi.patch('/client-portal/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-notifications'] }),
  })

  const unreadCount = data?.unreadCount ?? 0
  const notifications = data?.notifications ?? []

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    setOpen(!open)
    if (!open && unreadCount > 0) {
      markAllRead.mutate()
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-900 text-sm">Notifications</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <Bell className="w-8 h-8 text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">Aucune notification</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id} className={`flex items-start gap-3 px-4 py-3 ${!n.readAt ? 'bg-blue-50/40' : ''}`}>
                  <div className="mt-0.5">
                    <NotifIcon type={n.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-snug">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatTimeAgo(n.createdAt)}</p>
                  </div>
                  {!n.readAt && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, isLoading, fetchMe, logout } = useClientAuthStore()

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      fetchMe().catch(() => router.push('/client/login'))
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    toast.success('Déconnecté')
    router.push('/client/login')
  }

  if (isLoading || (!isAuthenticated && !user)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const navItems = [
    { href: '/client/dashboard', label: 'Mes devis', icon: FileText },
    { href: '/client/requests', label: 'Mes demandes', icon: ClipboardList },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900 text-sm">Espace Client</span>
            </div>
            <nav className="hidden sm:flex items-center gap-1">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    pathname === href || pathname.startsWith(href + '/')
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <NotificationsDropdown />
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600 px-2">
              <User className="w-4 h-4" />
              <span>{user?.firstName} {user?.lastName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>

        <div className="sm:hidden flex border-t border-gray-100">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition ${
                pathname === href || pathname.startsWith(href + '/')
                  ? 'text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-500'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
