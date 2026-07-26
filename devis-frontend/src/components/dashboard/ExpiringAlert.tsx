import Link from 'next/link'
import { AlertTriangle, Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { DashboardStats } from '@/hooks/useDashboard'

interface ExpiringAlertProps {
  quotes: DashboardStats['expiringQuotes']
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(dateStr)
  expiry.setHours(0, 0, 0, 0)
  return Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function ExpiringAlert({ quotes }: ExpiringAlertProps) {
  if (!quotes.length) return null

  return (
    <div className="bg-white rounded-xl border border-orange-200">
      <div className="px-5 py-4 border-b border-orange-100 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-orange-500" />
        <h2 className="text-sm font-semibold text-orange-800">
          {quotes.length} devis expire{quotes.length > 1 ? 'nt' : ''} bientôt
        </h2>
      </div>

      <div className="divide-y divide-orange-50">
        {quotes.map((q) => {
          const days = daysUntil(q.expiryDate)
          const urgency = days <= 1 ? 'text-red-600' : days <= 3 ? 'text-orange-600' : 'text-amber-600'

          return (
            <Link
              key={q.id}
              href={`/quotes/${q.id}`}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-orange-50/50 transition group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-gray-700 group-hover:text-blue-600 transition">
                    {q.number}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{q.client.name}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(q.totalTTC)}</p>
                <p className={`text-xs font-medium flex items-center justify-end gap-1 mt-0.5 ${urgency}`}>
                  <Clock className="w-3 h-3" />
                  {days === 0 ? 'Expire aujourd\'hui' : days === 1 ? 'Expire demain' : `J−${days}`}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
