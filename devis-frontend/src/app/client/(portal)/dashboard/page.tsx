'use client'

import { useQuery } from '@tanstack/react-query'
import { clientApi } from '@/lib/client-api'
import { FileText, Clock, CheckCircle, XCircle, AlertTriangle, ChevronRight, Plus } from 'lucide-react'
import Link from 'next/link'

interface MyQuote {
  id: string
  number: string
  title: string
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REFUSED' | 'EXPIRED'
  issueDate: string
  expiryDate: string
  signedAt?: string | null
  signatureToken?: string | null
  createdAt: string
  totalHT: number
}

const STATUS_CONFIG = {
  DRAFT:    { label: 'Brouillon',  color: 'bg-gray-100 text-gray-600',   icon: FileText },
  SENT:     { label: 'En attente', color: 'bg-blue-100 text-blue-700',   icon: Clock },
  ACCEPTED: { label: 'Accepté',    color: 'bg-green-100 text-green-700', icon: CheckCircle },
  REFUSED:  { label: 'Refusé',     color: 'bg-red-100 text-red-600',     icon: XCircle },
  EXPIRED:  { label: 'Expiré',     color: 'bg-orange-100 text-orange-600', icon: AlertTriangle },
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ClientDashboardPage() {
  const { data: quotes = [], isLoading } = useQuery<MyQuote[]>({
    queryKey: ['client-quotes'],
    queryFn: async () => {
      const res = await clientApi.get('/client-portal/quotes')
      return res.data.data
    },
  })

  const counts = {
    total: quotes.length,
    sent: quotes.filter((q) => q.status === 'SENT').length,
    accepted: quotes.filter((q) => q.status === 'ACCEPTED').length,
    refused: quotes.filter((q) => q.status === 'REFUSED').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes devis</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tous vos devis en un coup d'œil</p>
        </div>
        <Link
          href="/client/requests/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Nouvelle demande
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: counts.total, color: 'text-gray-900' },
          { label: 'En attente', value: counts.sent, color: 'text-blue-700' },
          { label: 'Acceptés', value: counts.accepted, color: 'text-green-700' },
          { label: 'Refusés', value: counts.refused, color: 'text-red-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-900 font-medium">Aucun devis pour l'instant</p>
            <p className="text-sm text-gray-500 mt-1">
              Faites une demande de devis pour commencer
            </p>
            <Link
              href="/client/requests/new"
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Faire une demande
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {quotes.map((quote) => {
              const cfg = STATUS_CONFIG[quote.status]
              const Icon = cfg.icon
              const canView = quote.status === 'SENT' && quote.signatureToken
              return (
                <li key={quote.id}>
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-400">{quote.number}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </div>
                      <p className="font-medium text-gray-900 text-sm truncate mt-0.5">{quote.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Émis le {formatDate(quote.issueDate)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-gray-900 text-sm">{formatCurrency(quote.totalHT)}</p>
                      <p className="text-xs text-gray-400">HT</p>
                    </div>
                    {canView && (
                      <Link
                        href={`/client/${quote.signatureToken}`}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition shrink-0"
                      >
                        Voir <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
