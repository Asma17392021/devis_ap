'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { Check, X, Download, FileText, Loader2, AlertTriangle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortalLine {
  id: string
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
  discount?: number | null
  discountType?: 'PERCENTAGE' | 'FIXED' | null
  position: number
}

interface PortalQuote {
  id: string
  number: string
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REFUSED' | 'EXPIRED'
  title: string
  issueDate: string
  expiryDate: string
  discount?: number | null
  discountType?: 'PERCENTAGE' | 'FIXED' | null
  termsAndConditions?: string | null
  pdfUrl?: string | null
  signedAt?: string | null
  client: { name: string; email: string }
  company: {
    name: string
    address?: string | null
    phone?: string | null
    email?: string | null
    logoUrl?: string | null
  }
  lines: PortalLine[]
  totals: {
    subtotalHT: number
    globalDiscountAmount: number
    totalHT: number
    vatByRate: Record<string, number>
    totalTVA: number
    totalTTC: number
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

const portalApi = axios.create({
  baseURL: (process.env.NEXT_PUBLIC_API_URL ?? '') + '/api',
})

// ─── Confirm modal ────────────────────────────────────────────────────────────

function ActionModal({
  open,
  action,
  quoteNumber,
  onConfirm,
  onCancel,
  isPending,
}: {
  open: boolean
  action: 'accept' | 'refuse'
  quoteNumber: string
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  if (!open) return null
  const isAccept = action === 'accept'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md z-10">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${isAccept ? 'bg-green-100' : 'bg-red-100'}`}>
          {isAccept ? <Check className="w-6 h-6 text-green-600" /> : <X className="w-6 h-6 text-red-600" />}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
          {isAccept ? 'Accepter ce devis ?' : 'Refuser ce devis ?'}
        </h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          {isAccept
            ? `Vous êtes sur le point d'accepter le devis ${quoteNumber}. Cette action vaut signature électronique.`
            : `Vous êtes sur le point de refuser le devis ${quoteNumber}. L'équipe sera notifiée.`}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition disabled:opacity-60 ${isAccept ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isAccept ? 'Oui, j\'accepte' : 'Oui, je refuse'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClientPortalPage({ params }: { params: { token: string } }) {
  const [modal, setModal] = useState<'accept' | 'refuse' | null>(null)
  const [actionDone, setActionDone] = useState<'accepted' | 'refused' | null>(null)

  const { data: quote, isLoading, error } = useQuery<PortalQuote>({
    queryKey: ['portal', params.token],
    queryFn: async () => {
      const res = await portalApi.get(`/client/${params.token}`)
      return res.data.data
    },
    retry: false,
  })

  const signMutation = useMutation({
    mutationFn: async (action: 'ACCEPTED' | 'REFUSED') => {
      const res = await portalApi.post(`/client/${params.token}/sign`, { decision: action })
      return res.data
    },
    onSuccess: (_, action) => {
      setActionDone(action === 'ACCEPTED' ? 'accepted' : 'refused')
      setModal(null)
    },
  })

  const handleConfirm = () => {
    if (!modal) return
    signMutation.mutate(modal === 'accept' ? 'ACCEPTED' : 'REFUSED')
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // ── Error / invalid token ──
  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Lien invalide ou expiré</h1>
          <p className="text-sm text-gray-500">
            Ce lien n'est plus valide. Contactez l'expéditeur pour obtenir un nouveau lien.
          </p>
        </div>
      </div>
    )
  }

  // ── Post-action screen ──
  if (actionDone) {
    const isAccepted = actionDone === 'accepted'
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow p-8 max-w-md w-full text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${isAccepted ? 'bg-green-100' : 'bg-gray-100'}`}>
            {isAccepted
              ? <Check className="w-8 h-8 text-green-600" />
              : <X className="w-8 h-8 text-gray-500" />}
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {isAccepted ? 'Devis accepté !' : 'Devis refusé'}
          </h1>
          <p className="text-sm text-gray-500 mb-1">
            {isAccepted
              ? `Vous avez accepté le devis ${quote.number}. Une confirmation vous a été envoyée par email.`
              : `Vous avez refusé le devis ${quote.number}. L'équipe a été notifiée.`}
          </p>
          {isAccepted && (
            <p className="text-xs text-gray-400 mt-4">
              Votre acceptation électronique a été enregistrée avec horodatage.
            </p>
          )}
        </div>
      </div>
    )
  }

  const isExpired = quote.status === 'EXPIRED'
  const isAlreadySigned = quote.status === 'ACCEPTED' || quote.status === 'REFUSED'
  const canSign = quote.status === 'SENT'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {quote.company.logoUrl ? (
              <img src={quote.company.logoUrl} alt={quote.company.name} className="h-8 w-auto" />
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
            )}
            <span className="font-semibold text-gray-900">{quote.company.name}</span>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Devis</p>
            <p className="text-sm font-mono font-semibold text-gray-900">{quote.number}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Status banners */}
        {isExpired && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-800">Ce devis a expiré</p>
              <p className="text-xs text-orange-600 mt-0.5">
                Date d'expiration : {formatDate(quote.expiryDate)}. Contactez-nous pour un nouveau devis.
              </p>
            </div>
          </div>
        )}

        {quote.status === 'ACCEPTED' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Devis accepté</p>
              {quote.signedAt && (
                <p className="text-xs text-green-600 mt-0.5">Signé le {formatDate(quote.signedAt)}</p>
              )}
            </div>
          </div>
        )}

        {quote.status === 'REFUSED' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <X className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm font-semibold text-red-800">Vous avez refusé ce devis</p>
          </div>
        )}

        {/* Quote header card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{quote.title}</h1>
              <p className="text-sm text-gray-500 mt-1">À l'attention de {quote.client.name}</p>
            </div>
            {quote.pdfUrl && (
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/quotes/${quote.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition shrink-0"
              >
                <Download className="w-4 h-4" />
                Télécharger PDF
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Émis le</p>
              <p className="font-medium text-gray-900">{formatDate(quote.issueDate)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Valable jusqu'au</p>
              <p className={`font-medium ${isExpired ? 'text-orange-600' : 'text-gray-900'}`}>
                {formatDate(quote.expiryDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Émetteur</p>
              <p className="font-medium text-gray-900">{quote.company.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Destinataire</p>
              <p className="font-medium text-gray-900">{quote.client.name}</p>
            </div>
          </div>
        </div>

        {/* Lines */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-20">Qté</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-28">P.U. HT</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-20">TVA</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-28">Total HT</th>
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
                      <tr key={line.id}>
                        <td className="px-4 py-3 text-gray-900">
                          {line.description}
                          {line.discount ? (
                            <span className="ml-2 text-xs text-green-600">
                              −{line.discount}{line.discountType === 'PERCENTAGE' ? '%' : '€'}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">{line.quantity}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(line.unitPrice)}</td>
                        <td className="px-4 py-3 text-center text-gray-400">{line.vatRate}%</td>
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
          <div className="rounded-xl border border-gray-200 overflow-hidden w-full max-w-sm">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-2.5 text-gray-600">Sous-total HT</td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">{formatCurrency(quote.totals.subtotalHT)}</td>
                </tr>

                {quote.totals.globalDiscountAmount > 0 && (
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-2.5 text-gray-600">
                      Remise globale{' '}
                      {quote.discount && quote.discountType && (
                        <span className="text-gray-400">
                          ({quote.discount}{quote.discountType === 'PERCENTAGE' ? '%' : '€'})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-red-600">
                      −{formatCurrency(quote.totals.globalDiscountAmount)}
                    </td>
                  </tr>
                )}

                <tr className="border-b border-gray-100">
                  <td className="px-4 py-2.5 text-gray-600">Total HT</td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">{formatCurrency(quote.totals.totalHT)}</td>
                </tr>

                {Object.entries(quote.totals.vatByRate)
                  .filter(([, v]) => v > 0)
                  .map(([rate, amount]) => (
                    <tr key={rate} className="border-b border-gray-100">
                      <td className="px-4 py-2.5 text-gray-500">TVA {rate}%</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{formatCurrency(amount)}</td>
                    </tr>
                  ))}

                <tr className="bg-blue-600">
                  <td className="px-4 py-3 text-white font-bold">Total TTC</td>
                  <td className="px-4 py-3 text-right text-white font-bold text-base">{formatCurrency(quote.totals.totalTTC)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Terms */}
        {quote.termsAndConditions && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Conditions générales</h3>
            <p className="text-sm text-gray-600 whitespace-pre-line">{quote.termsAndConditions}</p>
          </div>
        )}

        {/* CTA — accept / refuse */}
        {canSign && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Votre réponse</h3>
            <p className="text-sm text-gray-500 mb-5">
              En acceptant ce devis, vous confirmez votre accord et autorisez le démarrage des travaux.
              Votre réponse sera horodatée et conservée.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setModal('refuse')}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                <X className="w-4 h-4" />
                Refuser le devis
              </button>
              <button
                onClick={() => setModal('accept')}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition shadow-sm"
              >
                <Check className="w-4 h-4" />
                Accepter le devis
              </button>
            </div>
          </div>
        )}

        {/* Company footer */}
        <div className="text-center text-xs text-gray-400 pb-8 space-y-1">
          <p className="font-medium text-gray-500">{quote.company.name}</p>
          {quote.company.address && <p>{quote.company.address}</p>}
          <div className="flex items-center justify-center gap-3">
            {quote.company.phone && <span>{quote.company.phone}</span>}
            {quote.company.email && <span>{quote.company.email}</span>}
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal && (
        <ActionModal
          open={true}
          action={modal}
          quoteNumber={quote.number}
          onConfirm={handleConfirm}
          onCancel={() => setModal(null)}
          isPending={signMutation.isPending}
        />
      )}
    </div>
  )
}
