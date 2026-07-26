'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  ClipboardList, Car, Paperclip, FileText, Search,
  Clock, Loader2, CheckCircle, XCircle, ChevronDown,
  ExternalLink, AlertTriangle, X,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'

interface Attachment {
  id: string; fileName: string; fileUrl: string; mimeType: string; fileSize: number
}

interface QuoteRequest {
  id: string; title: string; description: string; status: RequestStatus
  vehicleMake?: string | null; vehicleModel?: string | null
  vehicleYear?: number | null; vehicleVin?: string | null; vehicleMileage?: number | null
  rejectionReason?: string | null; createdAt: string
  client: { id: string; name: string; email: string; phone?: string | null }
  attachments: Attachment[]
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  PENDING:     { label: 'En attente',  color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock },
  IN_PROGRESS: { label: 'En cours',    color: 'text-blue-700',   bg: 'bg-blue-100',   icon: Loader2 },
  COMPLETED:   { label: 'Traité',      color: 'text-green-700',  bg: 'bg-green-100',  icon: CheckCircle },
  REJECTED:    { label: 'Refusé',      color: 'text-red-600',    bg: 'bg-red-100',    icon: XCircle },
}

const STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  PENDING:     ['IN_PROGRESS', 'REJECTED'],
  IN_PROGRESS: ['COMPLETED', 'REJECTED'],
  COMPLETED:   [],
  REJECTED:    ['PENDING'],
}

const FILTER_TABS = [
  { label: 'Toutes', value: 'ALL' },
  { label: 'En attente', value: 'PENDING' },
  { label: 'En cours', value: 'IN_PROGRESS' },
  { label: 'Traitées', value: 'COMPLETED' },
  { label: 'Refusées', value: 'REJECTED' },
]

const REJECTION_PRESETS = [
  'Pièce en rupture de stock',
  'Référence introuvable',
  'Pièce non compatible avec ce véhicule',
  'Hors zone d\'intervention',
  'Demande incomplète — merci de préciser',
]

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Rejection modal ──────────────────────────────────────────────────────────

function RejectionModal({
  requestTitle,
  onConfirm,
  onCancel,
  isPending,
}: {
  requestTitle: string
  onConfirm: (reason: string) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Refuser la demande</h3>
              <p className="text-xs text-gray-500 truncate max-w-[220px]">{requestTitle}</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-3">
          Indiquez le motif de refus — il sera visible par le client et envoyé par email.
        </p>

        {/* Presets */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {REJECTION_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setReason(p)}
              className={`text-xs px-2.5 py-1 rounded-full border transition ${
                reason === p
                  ? 'border-red-400 bg-red-50 text-red-700 font-medium'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ou écrivez un motif personnalisé…"
          rows={3}
          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
        />

        {!reason.trim() && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-orange-600">
            <AlertTriangle className="w-3.5 h-3.5" />
            Le motif est obligatoire
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Annuler
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim() || isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-lg transition"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmer le refus
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Status dropdown ──────────────────────────────────────────────────────────

function StatusDropdown({
  request,
  onUpdate,
}: {
  request: QuoteRequest
  onUpdate: (id: string, s: RequestStatus, reason?: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const cfg = STATUS_CONFIG[request.status]
  const Icon = cfg.icon
  const transitions = STATUS_TRANSITIONS[request.status]

  if (transitions.length === 0) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {cfg.label}
      </span>
    )
  }

  const handleSelect = (s: RequestStatus) => {
    setOpen(false)
    if (s === 'REJECTED') {
      setShowRejectionModal(true)
    } else {
      onUpdate(request.id, s)
    }
  }

  const handleRejectionConfirm = (reason: string) => {
    setIsPending(true)
    onUpdate(request.id, 'REJECTED', reason)
    setShowRejectionModal(false)
    setIsPending(false)
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${cfg.bg} ${cfg.color} hover:opacity-80 transition`}
        >
          <Icon className="w-3.5 h-3.5" />
          {cfg.label}
          <ChevronDown className="w-3 h-3" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl border border-gray-200 shadow-lg py-1 min-w-[170px]">
              {transitions.map((s) => {
                const c = STATUS_CONFIG[s]
                const SIcon = c.icon
                return (
                  <button
                    key={s}
                    onClick={() => handleSelect(s)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center ${c.bg}`}>
                      <SIcon className={`w-3 h-3 ${c.color}`} />
                    </span>
                    Marquer « {c.label} »
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {showRejectionModal && (
        <RejectionModal
          requestTitle={request.title}
          onConfirm={handleRejectionConfirm}
          onCancel={() => setShowRejectionModal(false)}
          isPending={isPending}
        />
      )}
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminRequestsPage() {
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<{ data: QuoteRequest[]; pagination: { total: number } }>({
    queryKey: ['admin-requests', filter, search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' })
      if (filter !== 'ALL') params.set('status', filter)
      if (search) params.set('search', search)
      const res = await api.get(`/requests?${params}`)
      return res.data.data
    },
  })

  const mutation = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: RequestStatus; rejectionReason?: string }) => {
      await api.patch(`/requests/${id}`, { status, rejectionReason })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] })
      queryClient.invalidateQueries({ queryKey: ['request-counts'] })
    },
  })

  const requests = data?.data ?? []
  const total = data?.pagination.total ?? 0
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Demandes clients
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 bg-orange-500 text-white text-xs font-bold rounded-full">
                {pendingCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} demande{total > 1 ? 's' : ''} au total</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par client, véhicule, titre…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 self-start">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                filter === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
          <ClipboardList className="w-10 h-10 text-gray-300 mb-3" />
          <p className="font-medium text-gray-700">Aucune demande</p>
          <p className="text-sm text-gray-400 mt-1">Les demandes de vos clients apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const cfg = STATUS_CONFIG[req.status]
            const isExpanded = expanded === req.id
            const vehicleInfo = [req.vehicleMake, req.vehicleModel, req.vehicleYear].filter(Boolean).join(' ')
            const images = req.attachments.filter((a) => a.mimeType.startsWith('image/'))
            const pdfs = req.attachments.filter((a) => a.mimeType === 'application/pdf')

            return (
              <div key={req.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div
                  className="flex items-start gap-4 p-5 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => setExpanded(isExpanded ? null : req.id)}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
                    <ClipboardList className={`w-5 h-5 ${cfg.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{req.title}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-sm text-gray-600 font-medium">{req.client.name}</span>
                      {vehicleInfo && (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          <Car className="w-3 h-3" />{vehicleInfo}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{formatDate(req.createdAt)}</span>
                      {req.attachments.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Paperclip className="w-3 h-3" />
                          {req.attachments.length} fichier{req.attachments.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1.5 line-clamp-1">{req.description}</p>

                    {/* Rejection reason preview */}
                    {req.status === 'REJECTED' && req.rejectionReason && (
                      <div className="flex items-start gap-1.5 mt-2 text-xs text-red-700 bg-red-50 px-2.5 py-1.5 rounded-lg w-fit">
                        <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span><strong>Motif :</strong> {req.rejectionReason}</span>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    <StatusDropdown
                      request={req}
                      onUpdate={(id, status, rejectionReason) =>
                        mutation.mutate({ id, status, rejectionReason })
                      }
                    />
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400 font-medium mb-0.5">Client</p>
                        <p className="font-medium text-gray-800">{req.client.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium mb-0.5">Email</p>
                        <a href={`mailto:${req.client.email}`} className="text-blue-600 hover:underline truncate block text-sm">
                          {req.client.email}
                        </a>
                      </div>
                      {req.client.phone && (
                        <div>
                          <p className="text-xs text-gray-400 font-medium mb-0.5">Téléphone</p>
                          <p className="text-gray-800 text-sm">{req.client.phone}</p>
                        </div>
                      )}
                      {req.vehicleVin && (
                        <div>
                          <p className="text-xs text-gray-400 font-medium mb-0.5">VIN</p>
                          <p className="font-mono text-gray-800 text-xs">{req.vehicleVin}</p>
                        </div>
                      )}
                      {req.vehicleMileage && (
                        <div>
                          <p className="text-xs text-gray-400 font-medium mb-0.5">Kilométrage</p>
                          <p className="text-gray-800 text-sm">{req.vehicleMileage.toLocaleString('fr-FR')} km</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-1">Description</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line bg-white border border-gray-100 rounded-lg px-3 py-2.5">
                        {req.description}
                      </p>
                    </div>

                    {req.attachments.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-400 font-medium mb-2">Pièces jointes ({req.attachments.length})</p>
                        <div className="flex flex-wrap gap-3">
                          {images.map((img) => (
                            <a key={img.id} href={img.fileUrl} target="_blank" rel="noreferrer" className="group relative">
                              <img src={img.fileUrl} alt={img.fileName} className="w-24 h-24 rounded-lg object-cover border border-gray-200 group-hover:opacity-80 transition" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                <div className="bg-black/50 rounded-lg p-1.5"><ExternalLink className="w-4 h-4 text-white" /></div>
                              </div>
                            </a>
                          ))}
                          {pdfs.map((pdf) => (
                            <a key={pdf.id} href={pdf.fileUrl} target="_blank" rel="noreferrer"
                              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 hover:border-red-300 hover:bg-red-50 rounded-lg transition text-sm">
                              <div className="w-8 h-8 bg-red-50 rounded-md flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4 text-red-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-gray-800 font-medium text-xs truncate max-w-[140px]">{pdf.fileName}</p>
                                <p className="text-gray-400 text-xs">PDF</p>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {req.status !== 'REJECTED' && (
                      <div className="flex justify-end pt-1">
                        <a
                          href={`/quotes/new?clientId=${req.client.id}&requestTitle=${encodeURIComponent(req.title)}`}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
                        >
                          <FileText className="w-4 h-4" />
                          Créer le devis
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
