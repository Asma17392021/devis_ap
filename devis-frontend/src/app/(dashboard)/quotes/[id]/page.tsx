'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Download, Send, Trash2, Edit2, Check, X, Loader2,
  ExternalLink, Copy, FileText, Clock
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useQuote, useUpdateQuote, useSendQuote, useDeleteQuote
} from '@/hooks/useQuotes'
import { QuoteForm, QuoteFormValues } from '@/components/quotes/QuoteForm'
import { QuoteTotals } from '@/components/quotes/QuoteTotals'
import { StatusBadge, QuoteStatus } from '@/components/quotes/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/lib/api'

// ─── Portal link copy button ──────────────────────────────────────────────────

function PortalLinkSection({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  const portalUrl = `${window.location.origin}/client/${token}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
      <ExternalLink className="w-4 h-4 text-blue-500 shrink-0" />
      <span className="text-xs text-blue-700 font-mono truncate flex-1">{portalUrl}</span>
      <button
        onClick={handleCopy}
        className="shrink-0 p-1 text-blue-500 hover:text-blue-700 transition"
        title="Copier le lien"
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>
      <a
        href={portalUrl}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 p-1 text-blue-500 hover:text-blue-700 transition"
        title="Ouvrir"
      >
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  )
}

// ─── Read-only detail view ────────────────────────────────────────────────────

function QuoteDetailView({ quote }: { quote: ReturnType<typeof useQuote>['data'] & object }) {
  if (!quote) return null

  return (
    <div className="space-y-6">
      {/* General info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Informations générales</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Client</p>
            <p className="text-sm font-medium text-gray-900">{quote.client.name}</p>
            <p className="text-xs text-gray-400">{quote.client.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Titre</p>
            <p className="text-sm text-gray-900">{quote.title}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Émission</p>
            <p className="text-sm text-gray-900">{formatDate(quote.issueDate)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Expiration</p>
            <p className="text-sm text-gray-900">{formatDate(quote.expiryDate)}</p>
          </div>
        </div>
      </div>

      {/* Lines */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Lignes du devis</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Description</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase w-20">Qté</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase w-28">P.U. HT</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase w-20">TVA</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase w-32">Remise</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase w-28">Sous-total HT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {quote.lines
                .slice()
                .sort((a, b) => a.position - b.position)
                .map((line) => {
                  const gross = line.quantity * line.unitPrice
                  const lineHT = line.discount && line.discountType
                    ? line.discountType === 'PERCENTAGE'
                      ? gross * (1 - line.discount / 100)
                      : Math.max(0, gross - line.discount)
                    : gross
                  return (
                    <tr key={line.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-900">{line.description}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{line.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(line.unitPrice)}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{line.vatRate}%</td>
                      <td className="px-4 py-3 text-center text-gray-500">
                        {line.discount
                          ? `${line.discount}${line.discountType === 'PERCENTAGE' ? '%' : '€'}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(lineHT)}</td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <QuoteTotals
          totals={quote.totals}
          discount={quote.discount}
          discountType={quote.discountType}
        />
      </div>

      {/* Notes & Terms */}
      {(quote.notes || quote.termsAndConditions) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quote.notes && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Notes internes
                  <span className="ml-1 text-xs font-normal text-gray-400">(non visibles par le client)</span>
                </p>
                <p className="text-sm text-gray-600 whitespace-pre-line">{quote.notes}</p>
              </div>
            )}
            {quote.termsAndConditions && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Conditions générales</p>
                <p className="text-sm text-gray-600 whitespace-pre-line">{quote.termsAndConditions}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Signature info */}
      {quote.signedAt && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Devis signé électroniquement</p>
            <p className="text-xs text-green-600 mt-0.5">
              Signé le {formatDate(quote.signedAt)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QuoteDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { data: quote, isLoading } = useQuote(params.id)
  const updateQuote = useUpdateQuote(params.id)
  const sendQuote = useSendQuote()
  const deleteQuote = useDeleteQuote()

  const [isEditing, setIsEditing] = useState(false)
  const [showSendConfirm, setShowSendConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleSaveDraft = async (data: QuoteFormValues) => {
    try {
      await updateQuote.mutateAsync(data)
      toast.success('Devis mis à jour')
      setIsEditing(false)
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleSendToClient = async (data: QuoteFormValues) => {
    try {
      await updateQuote.mutateAsync(data)
      await sendQuote.mutateAsync(params.id)
      toast.success(`Devis ${quote?.number} envoyé au client`)
      setIsEditing(false)
    } catch {
      toast.error('Erreur lors de l\'envoi')
    }
  }

  const handleSend = async () => {
    if (!quote) return
    try {
      await sendQuote.mutateAsync(quote.id)
      toast.success(`Devis ${quote.number} envoyé au client`)
    } catch {
      toast.error('Erreur lors de l\'envoi')
    } finally {
      setShowSendConfirm(false)
    }
  }

  const handleDelete = async () => {
    if (!quote) return
    try {
      await deleteQuote.mutateAsync(quote.id)
      toast.success('Devis supprimé')
      router.push('/quotes')
    } catch {
      toast.error('Erreur lors de la suppression')
    } finally {
      setShowDeleteConfirm(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!quote) return
    try {
      const res = await api.get(`/quotes/${quote.id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${quote.number}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Erreur lors du téléchargement')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Devis introuvable</p>
        <Link href="/quotes" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
          Retour aux devis
        </Link>
      </div>
    )
  }

  const isDraft = quote.status === 'DRAFT'
  const isSent = quote.status === 'SENT'
  const canEdit = isDraft && !isEditing
  const canSend = isDraft
  const canDelete = isDraft && user?.role === 'ADMIN'
  const isSaving = updateQuote.isPending && !sendQuote.isPending
  const isSending = sendQuote.isPending

  // Build default values for the edit form
  const formDefaults: Partial<QuoteFormValues> = {
    clientId: quote.client.id,
    title: quote.title,
    issueDate: quote.issueDate.slice(0, 10),
    expiryDate: quote.expiryDate.slice(0, 10),
    discount: quote.discount,
    discountType: quote.discountType,
    notes: quote.notes,
    termsAndConditions: quote.termsAndConditions,
    lines: quote.lines
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        vatRate: l.vatRate,
        discount: l.discount,
        discountType: l.discountType,
      })),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/quotes"
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 font-mono">{quote.number}</h1>
              <StatusBadge status={quote.status as QuoteStatus} size="md" />
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Créé le {formatDate(quote.createdAt)}
              </span>
              <span>par {quote.createdBy.firstName} {quote.createdBy.lastName}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {isEditing ? (
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition"
            >
              <X className="w-4 h-4" />
              Annuler
            </button>
          ) : (
            <>
              <button
                onClick={handleDownloadPdf}
                title="Télécharger PDF"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>

              {canEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition"
                >
                  <Edit2 className="w-4 h-4" />
                  Modifier
                </button>
              )}

              {canSend && (
                <button
                  onClick={() => setShowSendConfirm(true)}
                  disabled={isSending}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-60"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Envoyer au client
                </button>
              )}

              {canDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Supprimer"
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Portal link — shown when SENT/ACCEPTED/REFUSED */}
      {(isSent || quote.status === 'ACCEPTED' || quote.status === 'REFUSED') && quote.signatureToken && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Lien portail client
          </p>
          <PortalLinkSection token={quote.signatureToken} />
        </div>
      )}

      {/* Form or detail view */}
      {isEditing ? (
        <QuoteForm
          key={quote.updatedAt}
          defaultValues={formDefaults}
          onSaveDraft={handleSaveDraft}
          onSendToClient={handleSendToClient}
          isSaving={isSaving}
          isSending={isSending}
        />
      ) : (
        <QuoteDetailView quote={quote} />
      )}

      {/* Confirm send */}
      <ConfirmDialog
        open={showSendConfirm}
        title="Envoyer le devis ?"
        description={`Le devis ${quote.number} sera envoyé au client ${quote.client.name} par email. Un PDF sera généré automatiquement.`}
        confirmLabel="Envoyer"
        onConfirm={handleSend}
        onCancel={() => setShowSendConfirm(false)}
      />

      {/* Confirm delete */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Supprimer le devis ?"
        description={`Le devis ${quote.number} sera définitivement supprimé. Cette action est irréversible.`}
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}
