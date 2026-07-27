'use client'

import { useQuery } from '@tanstack/react-query'
import { clientApi } from '@/lib/client-api'
import { ClipboardList, Clock, CheckCircle, XCircle, Loader2, Plus, ArrowRight, Car, Paperclip, FileText, UserRound } from 'lucide-react'
import Link from 'next/link'

interface Attachment {
  id: string
  fileName: string
  fileUrl: string
  mimeType: string
  fileSize: number
}

interface QuoteRequest {
  id: string
  title: string
  description: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'
  vehicleMake?: string | null
  vehicleModel?: string | null
  vehicleYear?: number | null
  vehicleMileage?: number | null
  rejectionReason?: string | null
  createdAt: string
  attachments: Attachment[]
  handledBy?: { firstName: string; lastName: string } | null
}

const STATUS_CONFIG = {
  PENDING:     { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  IN_PROGRESS: { label: 'En cours',   color: 'bg-blue-100 text-blue-700',    icon: Loader2 },
  COMPLETED:   { label: 'Traité',     color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  REJECTED:    { label: 'Refusé',     color: 'bg-red-100 text-red-600',      icon: XCircle },
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ClientRequestsPage() {
  const { data: requests = [], isLoading } = useQuery<QuoteRequest[]>({
    queryKey: ['client-requests'],
    queryFn: async () => {
      const res = await clientApi.get('/client-portal/quote-requests')
      return res.data.data
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes demandes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Suivez vos demandes de devis pièces véhicule</p>
        </div>
        <Link
          href="/client/requests/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Nouvelle demande
        </Link>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 bg-white rounded-xl border border-gray-200">
            <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4 bg-white rounded-xl border border-gray-200">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <ClipboardList className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-900 font-medium">Aucune demande</p>
            <p className="text-sm text-gray-500 mt-1">
              Décrivez les pièces dont vous avez besoin
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
          requests.map((req) => {
            const cfg = STATUS_CONFIG[req.status]
            const Icon = cfg.icon
            const vehicleInfo = [req.vehicleMake, req.vehicleModel, req.vehicleYear].filter(Boolean).join(' ')
            const images = req.attachments.filter((a) => a.mimeType.startsWith('image/'))
            const docs = req.attachments.filter((a) => a.mimeType === 'application/pdf')

            return (
              <div key={req.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-gray-900">{req.title}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </div>

                      {vehicleInfo && (
                        <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 rounded-md px-2 py-1 w-fit mb-2">
                          <Car className="w-3 h-3" />
                          {vehicleInfo}
                          {req.vehicleMileage && ` — ${req.vehicleMileage.toLocaleString('fr-FR')} km`}
                        </div>
                      )}

                      <p className="text-sm text-gray-600 line-clamp-2">{req.description}</p>

                      {req.handledBy && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                          <UserRound className="w-3.5 h-3.5" />
                          Traité par {req.handledBy.firstName} {req.handledBy.lastName}
                        </div>
                      )}

                      {/* Rejection reason */}
                      {req.status === 'REJECTED' && req.rejectionReason && (
                        <div className="flex items-start gap-1.5 mt-2 text-xs text-red-700 bg-red-50 border border-red-100 px-2.5 py-2 rounded-lg">
                          <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span><strong>Motif de refus :</strong> {req.rejectionReason}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attachments */}
                  {req.attachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {/* Images grid */}
                      {images.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {images.map((img) => (
                            <a
                              key={img.id}
                              href={img.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block"
                            >
                              <img
                                src={img.fileUrl}
                                alt={img.fileName}
                                className="w-16 h-16 rounded-lg object-cover border border-gray-200 hover:opacity-80 transition"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                      {/* PDF list */}
                      {docs.map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {doc.fileName}
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-gray-400">Envoyée le {formatDate(req.createdAt)}</p>
                    {req.attachments.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Paperclip className="w-3 h-3" />
                        {req.attachments.length} fichier{req.attachments.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {requests.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" />
          <p className="text-sm text-blue-700">
            Quand votre demande est traitée, le devis apparaît dans{' '}
            <Link href="/client/dashboard" className="font-semibold underline">Mes devis</Link>.
          </p>
        </div>
      )}
    </div>
  )
}
