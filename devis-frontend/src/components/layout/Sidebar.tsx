'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Users,
  UserCog,
  Settings,
  LogOut,
  Bell,
  ChevronRight,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { useNotifications } from '@/hooks/useNotifications'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'

const NAV_ITEMS = [
  { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/quotes', label: 'Devis', icon: FileText },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/requests', label: 'Demandes', icon: ClipboardList },
]

const ADMIN_ITEMS = [
  { href: '/users', label: 'Utilisateurs', icon: UserCog },
]

const BOTTOM_ITEMS = [
  { href: '/settings', label: 'Paramètres', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { unreadCount } = useNotifications()

  const { data: requestCounts } = useQuery<{ pending: number; inProgress: number; total: number }>({
    queryKey: ['request-counts'],
    queryFn: async () => {
      const res = await api.get('/requests/counts')
      return res.data.data
    },
    refetchInterval: 60_000, // refresh every minute
  })

  const pendingRequests = requestCounts?.pending ?? 0

  const handleLogout = async () => {
    await logout()
    toast.success('Déconnecté')
    router.push('/login')
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">Devis Pro</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href)}
            badge={item.href === '/requests' && pendingRequests > 0 ? pendingRequests : undefined}
          />
        ))}

        {user?.role === 'ADMIN' && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Administration
              </p>
            </div>
            {ADMIN_ITEMS.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
          </>
        )}

        <div className="pt-4 pb-1 px-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Compte
          </p>
        </div>
        {BOTTOM_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-gray-200 p-3">
        {/* Notification shortcut */}
        <Link
          href="/notifications"
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition mb-1"
        >
          <Bell className="w-4 h-4" />
          <span className="text-sm flex-1">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User profile */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <span className="text-blue-700 font-semibold text-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Se déconnecter"
            className="text-gray-400 hover:text-red-500 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

function NavLink({
  item,
  active,
  badge,
}: {
  item: { href: string; label: string; icon: React.ElementType }
  active: boolean
  badge?: number
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition group',
        active
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600')} />
      <span className="flex-1">{item.label}</span>
      {badge !== undefined && (
        <span className="bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
      {active && !badge && <ChevronRight className="w-3.5 h-3.5 text-blue-400" />}
    </Link>
  )
}
