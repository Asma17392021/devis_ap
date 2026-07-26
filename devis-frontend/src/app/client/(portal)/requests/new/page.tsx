'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clientApi } from '@/lib/client-api'
import {
  Loader2, ArrowLeft, Send, Car, FileText, X,
  Upload, Image as ImageIcon, AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadedFile {
  id: string
  fileName: string
  fileUrl: string
  mimeType: string
  fileSize: number
}

interface LocalFile {
  file: File
  preview: string | null // data URL for images
  uploading: boolean
  error?: string
  uploaded?: UploadedFile
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(1, 'Titre requis').max(200),
  description: z.string().min(5, 'Description trop courte').max(5000),
  vehicleMake: z.string().max(100).optional(),
  vehicleModel: z.string().max(100).optional(),
  vehicleYear: z.string().optional(),
  vehicleVin: z.string().max(17).optional(),
  vehicleMileage: z.string().optional(),
})
type Form = z.infer<typeof schema>

const CURRENT_YEAR = new Date().getFullYear()
const MAKES = [
  'Alfa Romeo', 'Audi', 'BMW', 'Citroën', 'Dacia', 'Fiat', 'Ford',
  'Honda', 'Hyundai', 'Kia', 'Mazda', 'Mercedes-Benz', 'Mitsubishi',
  'Nissan', 'Opel', 'Peugeot', 'Renault', 'Seat', 'Skoda', 'Subaru',
  'Suzuki', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo', 'Autre',
]

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} Ko`
    : `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NewRequestPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  // ── Create request mutation ───────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: Form) => {
      const payload: Record<string, unknown> = {
        title: data.title,
        description: data.description,
      }
      if (data.vehicleMake) payload.vehicleMake = data.vehicleMake
      if (data.vehicleModel) payload.vehicleModel = data.vehicleModel
      if (data.vehicleYear) payload.vehicleYear = parseInt(data.vehicleYear)
      if (data.vehicleVin) payload.vehicleVin = data.vehicleVin.toUpperCase()
      if (data.vehicleMileage) payload.vehicleMileage = parseInt(data.vehicleMileage)

      const res = await clientApi.post('/client-portal/quote-requests', payload)
      return res.data.data as { id: string }
    },
  })

  // ── Upload a single file to an existing request ───────────────────────────
  const uploadFile = async (requestId: string, localFile: LocalFile, index: number) => {
    const formData = new FormData()
    formData.append('file', localFile.file)

    try {
      setLocalFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, uploading: true, error: undefined } : f))
      )
      const res = await clientApi.post(
        `/client-portal/quote-requests/${requestId}/attachments`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      setLocalFiles((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, uploading: false, uploaded: res.data.data } : f
        )
      )
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erreur upload'
      setLocalFiles((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, uploading: false, error: msg } : f
        )
      )
    }
  }

  const onSubmit = async (data: Form) => {
    try {
      const request = await createMutation.mutateAsync(data)

      // Upload all files in parallel
      if (localFiles.length > 0) {
        await Promise.all(
          localFiles.map((lf, i) => uploadFile(request.id, lf, i))
        )
      }

      queryClient.invalidateQueries({ queryKey: ['client-requests'] })
      toast.success('Demande envoyée ! Nous vous répondrons rapidement.')
      router.push('/client/requests')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erreur lors de l\'envoi')
    }
  }

  // ── File handling ─────────────────────────────────────────────────────────
  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files)
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
    const maxSizeMb = 15

    const valid = arr.filter((f) => {
      if (!allowed.includes(f.type)) {
        toast.error(`${f.name} : type non supporté (JPG, PNG, PDF uniquement)`)
        return false
      }
      if (f.size > maxSizeMb * 1024 * 1024) {
        toast.error(`${f.name} : fichier trop lourd (max ${maxSizeMb} Mo)`)
        return false
      }
      return true
    })

    const remaining = 8 - localFiles.length
    if (valid.length > remaining) {
      toast.error(`Maximum 8 fichiers. ${remaining} emplacement(s) disponible(s).`)
      valid.splice(remaining)
    }

    const newFiles: LocalFile[] = valid.map((f) => ({
      file: f,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      uploading: false,
    }))

    setLocalFiles((prev) => [...prev, ...newFiles])
  }

  const removeFile = (index: number) => {
    setLocalFiles((prev) => {
      const f = prev[index]
      if (f.preview) URL.revokeObjectURL(f.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const isSubmitting = createMutation.isPending || localFiles.some((f) => f.uploading)

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/client/requests"
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demande de devis</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pièces et prestations véhicule</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Infos véhicule ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Car className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">Informations véhicule</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Marque */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Marque</label>
              <select
                {...register('vehicleMake')}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="">Sélectionner…</option>
                {MAKES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Modèle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Modèle</label>
              <input
                {...register('vehicleModel')}
                placeholder="Ex : Clio, 308, Golf…"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Année */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Année</label>
              <input
                {...register('vehicleYear')}
                type="number"
                min={1950}
                max={CURRENT_YEAR + 1}
                placeholder={String(CURRENT_YEAR)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Kilométrage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Kilométrage</label>
              <input
                {...register('vehicleMileage')}
                type="number"
                min={0}
                placeholder="Ex : 85000"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          {/* VIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Numéro VIN / Châssis{' '}
              <span className="text-gray-400 font-normal">(optionnel — 17 caractères)</span>
            </label>
            <input
              {...register('vehicleVin')}
              placeholder="Ex : VF1RFD00X65836245"
              maxLength={17}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono uppercase"
            />
          </div>
        </div>

        {/* ── Détail de la demande ────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">Détail de la demande</h2>
          </div>

          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              {...register('title')}
              placeholder="Ex : Remplacement plaquettes de frein avant + disques"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('description')}
              rows={5}
              placeholder={`Décrivez les pièces ou prestations souhaitées :\n- Référence ou désignation exacte des pièces\n- Symptômes / problème observé\n- Urgence éventuelle`}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
            )}
          </div>
        </div>

        {/* ── Photos / Documents ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-semibold text-gray-900">Photos / Documents</h2>
            </div>
            <span className="text-xs text-gray-400">{localFiles.length}/8 fichiers</span>
          </div>

          {/* Drop zone */}
          {localFiles.length < 8 && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
              }`}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">
                Glissez vos fichiers ici ou{' '}
                <span className="text-blue-600">cliquez pour parcourir</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                JPG, PNG, WEBP, HEIC, PDF — max 15 Mo par fichier
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                className="hidden"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </div>
          )}

          {/* File list */}
          {localFiles.length > 0 && (
            <ul className="space-y-2">
              {localFiles.map((lf, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50"
                >
                  {/* Thumbnail or PDF icon */}
                  {lf.preview ? (
                    <img
                      src={lf.preview}
                      alt={lf.file.name}
                      className="w-12 h-12 rounded-lg object-cover shrink-0 border border-gray-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-red-500" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{lf.file.name}</p>
                    <p className="text-xs text-gray-400">{formatSize(lf.file.size)}</p>
                    {lf.error && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3 h-3" />
                        {lf.error}
                      </p>
                    )}
                  </div>

                  {lf.uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Actions ────────────────────────────────────────────────────── */}
        <div className="flex gap-3">
          <Link
            href="/client/requests"
            className="flex-1 text-center px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition text-sm"
          >
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
              : <><Send className="w-4 h-4" /> Envoyer la demande</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
