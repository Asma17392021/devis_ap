import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { StatusBadge, QuoteStatus } from '@/components/quotes/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { DashboardStats } from '@/hooks/useDashboard'

interface RecentQuotesListProps {
  quotes: DashboardStats['recentQuotes']
}

export function RecentQuotesList({ quotes }: RecentQuotesListProps) {
  if (!quotes.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Devis récents</h2>
        </div>
        <div className="py-10 text-center text-sm text-gray-400">Aucun devis pour l'instant</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Devis récents</h2>
        <Link
          href="/quotes"
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition"
        >
          Voir tout
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="divide-y divide-gray-50">
        {quotes.map((q) => (
          <Link
            key={q.id}
            href={`/quotes/${q.id}`}
            className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition group"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-gray-700 group-hover:text-blue-600 transition">
                  {q.number}
                </span>
                <StatusBadge status={q.status as QuoteStatus} />
              </div>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{q.client.name}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(q.totalTTC)}</p>
              <p className="text-xs text-gray-400">{formatDate(q.issueDate)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function RecentQuotesListSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 animate-pulse">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="h-4 bg-gray-100 rounded w-32" />
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50">
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-100 rounded w-24" />
            <div className="h-2.5 bg-gray-100 rounded w-32" />
          </div>
          <div className="space-y-1.5 text-right">
            <div className="h-3 bg-gray-100 rounded w-20" />
            <div className="h-2.5 bg-gray-100 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}
