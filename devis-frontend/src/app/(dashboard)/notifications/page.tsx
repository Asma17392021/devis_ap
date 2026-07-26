'use client'

import { Bell, Check, CheckCheck, FileText, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDate } from '@/lib/utils'

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  QUOTE_ACCEPTED: { label: 'Devis accepté', color: 'text-green-600 bg-green-50' },
  QUOTE_REFUSED: { label: 'Devis refusé', color: 'text-red-600 bg-red-50' },
  QUOTE_EXPIRING: { label: 'Devis expirant', color: 'text-orange-600 bg-orange-50' },
}

export default function NotificationsPage() {
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition"
          >
            <CheckCheck className="w-4 h-4" />
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Aucune notification pour l'instant</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notifications.map((n) => {
              const meta = TYPE_LABELS[n.type] ?? { label: n.type, color: 'text-gray-600 bg-gray-100' }
              const isUnread = !n.readAt
              return (
                <li
                  key={n.id}
                  className={`flex items-start gap-4 px-5 py-4 transition ${isUnread ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`}
                >
                  {/* Icon */}
                  <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${meta.color}`}>
                    <FileText className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${meta.color}`}>
                        {meta.label}
                      </span>
                      {isUnread && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-800">{n.message}</p>
                    {n.quote && (
                      <Link
                        href={`/quotes/${n.quote.id}`}
                        className="text-xs text-blue-600 hover:underline mt-0.5 inline-block"
                      >
                        {n.quote.number} — {n.quote.title}
                      </Link>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{formatDate(n.createdAt)}</p>
                  </div>

                  {/* Mark as read */}
                  {isUnread && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      title="Marquer comme lu"
                      className="shrink-0 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
