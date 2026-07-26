'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Edit2, Mail, Phone, MapPin, Building2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useClient, useUpdateClient } from '@/hooks/useClients'
import { useQuotes } from '@/hooks/useQuotes'
import { StatusBadge, QuoteStatus } from '@/components/quotes/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils'

// ─── Edit form ────────────────────────────────────────────────────────────────

const clientSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().default('FR'),
  siret: z.string().optional().nullable(),
  vatNumber: z.string().optional().nullable(),
})
type ClientFormValues = z.infer<typeof clientSchema>

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)

  const { data: client, isLoading } = useClient(params.id)
  const { data: quotesData } = useQuotes({ clientId: params.id, limit: 10 })
  const updateClient = useUpdateClient(params.id)

  const { register, handleSubmit, formState: { errors } } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    values: client
      ? { ...client, country: client.country ?? 'FR' }
      : undefined,
  })

  const onSubmit = async (data: ClientFormValues) => {
    try {
      await updateClient.mutateAsync(data)
      toast.success('Client mis à jour')
      setIsEditing(false)
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Client introuvable</p>
        <Link href="/clients" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
          Retour aux clients
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/clients"
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Client depuis le {formatDate(client.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={updateClient.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-60"
              >
                {updateClient.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Enregistrer
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition"
              >
                <Edit2 className="w-4 h-4" />
                Modifier
              </button>
              <Link
                href={`/quotes/new`}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                Nouveau devis
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Informations</h2>

            {isEditing ? (
              <div className="space-y-4">
                {[
                  { label: 'Nom *', key: 'name', type: 'text' },
                  { label: 'Email *', key: 'email', type: 'email' },
                  { label: 'Téléphone', key: 'phone', type: 'tel' },
                  { label: 'Adresse', key: 'address', type: 'text' },
                  { label: 'Ville', key: 'city', type: 'text' },
                  { label: 'Code postal', key: 'postalCode', type: 'text' },
                  { label: 'SIRET', key: 'siret', type: 'text' },
                  { label: 'N° TVA', key: 'vatNumber', type: 'text' },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                    <input
                      {...register(key as keyof ClientFormValues)}
                      type={type}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors[key as keyof ClientFormValues] && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors[key as keyof ClientFormValues]?.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <a href={`mailto:${client.email}`} className="text-sm text-blue-600 hover:underline">
                    {client.email}
                  </a>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-700">{client.phone}</span>
                  </div>
                )}
                {(client.address || client.city) && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div className="text-sm text-gray-700">
                      {client.address && <p>{client.address}</p>}
                      {(client.postalCode || client.city) && (
                        <p>{[client.postalCode, client.city].filter(Boolean).join(' ')}</p>
                      )}
                    </div>
                  </div>
                )}
                {(client.siret || client.vatNumber) && (
                  <div className="flex items-start gap-2.5 pt-2 border-t border-gray-100">
                    <Building2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div className="text-sm text-gray-600">
                      {client.siret && <p>SIRET : {client.siret}</p>}
                      {client.vatNumber && <p>TVA : {client.vatNumber}</p>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quotes */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                Devis{quotesData ? ` (${quotesData.pagination.total})` : ''}
              </h2>
              <Link
                href={`/quotes?clientId=${client.id}`}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium transition"
              >
                Voir tous
              </Link>
            </div>

            {!quotesData?.data.length ? (
              <div className="py-10 text-center text-sm text-gray-400">
                Aucun devis pour ce client
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {quotesData.data.map((q) => (
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
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{q.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(q.totals.totalTTC)}</p>
                      <p className="text-xs text-gray-400">{formatDate(q.issueDate)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
