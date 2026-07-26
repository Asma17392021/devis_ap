'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Download, Filter, ChevronLeft, ChevronRight, Send, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useQuotes, useSendQuote, useDeleteQuote } from '@/hooks/useQuotes'
import { StatusBadge, QuoteStatus } from '@/components/quotes/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/lib/api'

const STATUSES: QuoteStatus[] = ['DRAFT', 'SENT', 'ACCEPTED', 'REFUSED', 'EXPIRED']

export default function QuotesPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  // Filters
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  // Confirm dialogs
  const [sendTarget, setSendTarget] = useState<{ id: string; number: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; number: string } | null>(null)

  const { data, isLoading } = useQuotes({ status, search, dateFrom, dateTo, page, limit: 15 })
  const sendQuote = useSendQuote()
  const deleteQuote = useDeleteQuote()

  const handleSend = async () => {
    if (!sendTarget) return
    try {
      await sendQuote.mutateAsync(sendTarget.id)
      toast.success(`Devis ${sendTarget.number} envoyé au client`)
    } catch {
      toast.error('Erreur lors de l\'envoi')
    } finally {
      setSendTarget(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteQuote.mutateAsync(deleteTarget.id)
      toast.success('Devis supprimé')
    } catch {
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      const res = await api.get(`/export/excel?${params}`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `devis-export-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Erreur lors de l\'export')
    }
  }

  const totalPages = data?.pagination.totalPages ?? 1

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Devis</h1>
          {data && (
            <p className="text-sm text-gray-500 mt-0.5">{data.pagination.total} devis au total</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition"
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
          <Link
            href="/quotes/new"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Nouveau devis
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filtres</span>
          </div>

          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les statuts</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s === 'DRAFT' ? 'Brouillon' : s === 'SENT' ? 'Envoyé' : s === 'ACCEPTED' ? 'Accepté' : s === 'REFUSED' ? 'Refusé' : 'Expiré'}</option>
            ))}
          </select>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400 text-sm">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {(status || dateFrom || dateTo) && (
            <button
              onClick={() => { setStatus(''); setDateFrom(''); setDateTo(''); setPage(1) }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900 transition"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Chargement...</div>
        ) : !data?.data.length ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">Aucun devis trouvé</p>
            <Link href="/quotes/new" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
              Créer votre premier devis
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Numéro</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Montant TTC</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Émission</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiration</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.data.map((quote) => (
                <tr
                  key={quote.id}
                  className="hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => router.push(`/quotes/${quote.id}`)}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium text-gray-900">{quote.number}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate">{quote.client.name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(quote.totals.totalTTC)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={quote.status as QuoteStatus} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(quote.issueDate)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(quote.expiryDate)}</td>
                  <td className="px-4 py-3">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => router.push(`/quotes/${quote.id}`)}
                        title="Voir"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {quote.status === 'DRAFT' && (
                        <button
                          onClick={() => setSendTarget({ id: quote.id, number: quote.number })}
                          title="Envoyer"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}

                      {quote.status === 'DRAFT' && user?.role === 'ADMIN' && (
                        <button
                          onClick={() => setDeleteTarget({ id: quote.id, number: quote.number })}
                          title="Supprimer"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Page {data.pagination.page} sur {totalPages} — {data.pagination.total} résultats
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm send */}
      <ConfirmDialog
        open={!!sendTarget}
        title="Envoyer le devis ?"
        description={`Le devis ${sendTarget?.number} sera envoyé au client par email. Un PDF sera généré automatiquement.`}
        confirmLabel="Envoyer"
        onConfirm={handleSend}
        onCancel={() => setSendTarget(null)}
      />

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer le devis ?"
        description={`Le devis ${deleteTarget?.number} sera définitivement supprimé. Cette action est irréversible.`}
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
