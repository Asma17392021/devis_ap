'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useSettings, useUpdateSettings } from '@/hooks/useUsers'
import { useAuthStore } from '@/stores/auth.store'

// ─── Schema ───────────────────────────────────────────────────────────────────

const settingsSchema = z.object({
  companyName: z.string().min(1, 'Nom requis'),
  companyEmail: z.string().email('Email invalide').optional().nullable(),
  companyPhone: z.string().optional().nullable(),
  companyAddress: z.string().optional().nullable(),
  companyCity: z.string().optional().nullable(),
  companyPostalCode: z.string().optional().nullable(),
  companyCountry: z.string().optional().nullable(),
  companySiret: z.string().optional().nullable(),
  companyVatNumber: z.string().optional().nullable(),
  defaultTermsAndConditions: z.string().optional().nullable(),
  defaultQuoteValidityDays: z.coerce.number().int().positive().optional(),
  notifyOnQuoteAccepted: z.boolean().optional(),
  notifyOnQuoteRefused: z.boolean().optional(),
  notifyOnQuoteExpiring: z.boolean().optional(),
})

type SettingsFormValues = z.infer<typeof settingsSchema>

// ─── Section component ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-5">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuthStore()
  const { data: settings, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      companyName: '',
      defaultQuoteValidityDays: 30,
      notifyOnQuoteAccepted: true,
      notifyOnQuoteRefused: true,
      notifyOnQuoteExpiring: true,
    },
  })

  // Populate form when settings load
  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      reset(settings as Partial<SettingsFormValues>)
    }
  }, [settings, reset])

  const onSubmit = async (data: SettingsFormValues) => {
    try {
      await updateSettings.mutateAsync(data)
      toast.success('Paramètres enregistrés')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const isAdmin = user?.role === 'ADMIN'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configuration de votre entreprise</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={updateSettings.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-60"
          >
            {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          Seuls les administrateurs peuvent modifier les paramètres.
        </div>
      )}

      {/* Company info */}
      <Section title="Informations entreprise">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nom de l'entreprise *" error={errors.companyName?.message}>
            <input
              {...register('companyName')}
              disabled={!isAdmin}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </Field>

          <Field label="Email" error={errors.companyEmail?.message}>
            <input
              {...register('companyEmail')}
              type="email"
              disabled={!isAdmin}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </Field>

          <Field label="Téléphone">
            <input
              {...register('companyPhone')}
              type="tel"
              disabled={!isAdmin}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </Field>

          <Field label="Adresse">
            <input
              {...register('companyAddress')}
              disabled={!isAdmin}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </Field>

          <Field label="Ville">
            <input
              {...register('companyCity')}
              disabled={!isAdmin}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </Field>

          <Field label="Code postal">
            <input
              {...register('companyPostalCode')}
              disabled={!isAdmin}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </Field>

          <Field label="SIRET">
            <input
              {...register('companySiret')}
              disabled={!isAdmin}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </Field>

          <Field label="Numéro TVA intracommunautaire">
            <input
              {...register('companyVatNumber')}
              disabled={!isAdmin}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </Field>
        </div>
      </Section>

      {/* Quote defaults */}
      <Section title="Paramètres des devis">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Validité par défaut (jours)" error={errors.defaultQuoteValidityDays?.message}>
            <input
              {...register('defaultQuoteValidityDays')}
              type="number"
              min="1"
              disabled={!isAdmin}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Conditions générales par défaut">
            <textarea
              {...register('defaultTermsAndConditions')}
              rows={5}
              disabled={!isAdmin}
              placeholder="Ces conditions seront pré-remplies lors de la création d'un nouveau devis..."
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-50"
            />
          </Field>
        </div>
      </Section>

      {/* Notification preferences */}
      <Section title="Notifications">
        <div className="space-y-3">
          {[
            { key: 'notifyOnQuoteAccepted', label: 'Devis accepté par le client' },
            { key: 'notifyOnQuoteRefused', label: 'Devis refusé par le client' },
            { key: 'notifyOnQuoteExpiring', label: 'Devis expirant dans 3 jours' },
          ].map(({ key, label }) => (
            <label key={key} className={`flex items-center gap-3 ${!isAdmin ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
              <input
                {...register(key as keyof SettingsFormValues)}
                type="checkbox"
                disabled={!isAdmin}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Ces notifications sont envoyées aux administrateurs et managers via FCM (app mobile) et enregistrées dans la cloche.
        </p>
      </Section>

      {isAdmin && (
        <div className="flex justify-end pb-4">
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={updateSettings.isPending}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-60"
          >
            {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {updateSettings.isPending ? 'Enregistrement...' : 'Enregistrer les paramètres'}
          </button>
        </div>
      )}
    </div>
  )
}
