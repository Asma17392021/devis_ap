'use client'

import { useEffect, useCallback } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, GripVertical, Loader2 } from 'lucide-react'
import { useClientsSelect } from '@/hooks/useClients'
import { QuoteTotals, Totals } from '@/components/quotes/QuoteTotals'
import { formatCurrency } from '@/lib/utils'

// ─── Schema ───────────────────────────────────────────────────────────────────

const lineSchema = z.object({
  description: z.string().min(1, 'Description requise'),
  quantity: z.coerce.number().positive('> 0'),
  unitPrice: z.coerce.number().min(0),
  vatRate: z.coerce.number().min(0).max(100),
  discount: z.coerce.number().min(0).optional().nullable(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional().nullable(),
})

export const quoteFormSchema = z.object({
  clientId: z.string().uuid('Sélectionnez un client'),
  title: z.string().min(1, 'Titre requis'),
  issueDate: z.string().min(1, 'Date requise'),
  expiryDate: z.string().min(1, 'Date requise'),
  discount: z.coerce.number().min(0).optional().nullable(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional().nullable(),
  notes: z.string().optional().nullable(),
  termsAndConditions: z.string().optional().nullable(),
  lines: z.array(lineSchema).min(1, 'Au moins une ligne requise'),
})

export type QuoteFormValues = z.infer<typeof quoteFormSchema>

// ─── Pure calculation (mirrors backend logic) ─────────────────────────────────

function calcLineSubtotal(q: number, p: number, d?: number | null, dt?: string | null): number {
  const gross = q * p
  if (!d || !dt) return gross
  return dt === 'PERCENTAGE' ? gross * (1 - d / 100) : Math.max(0, gross - d)
}

function calcTotals(
  lines: QuoteFormValues['lines'],
  globalDiscount?: number | null,
  globalDiscountType?: string | null
): Totals {
  const subtotalHT = lines.reduce(
    (s, l) => s + calcLineSubtotal(l.quantity || 0, l.unitPrice || 0, l.discount, l.discountType),
    0
  )

  let globalDiscountAmount = 0
  if (globalDiscount && globalDiscountType) {
    globalDiscountAmount = globalDiscountType === 'PERCENTAGE'
      ? subtotalHT * (globalDiscount / 100)
      : Math.min(globalDiscount, subtotalHT)
  }

  const totalHT = subtotalHT - globalDiscountAmount
  const ratio = subtotalHT > 0 ? totalHT / subtotalHT : 1

  const vatByRate: Record<string, number> = {}
  lines.forEach((l) => {
    const lineHT = calcLineSubtotal(l.quantity || 0, l.unitPrice || 0, l.discount, l.discountType) * ratio
    const vatAmt = lineHT * ((l.vatRate || 0) / 100)
    const key = (l.vatRate || 0).toFixed(1)
    vatByRate[key] = (vatByRate[key] ?? 0) + vatAmt
  })

  for (const k of Object.keys(vatByRate)) vatByRate[k] = Math.round(vatByRate[k] * 100) / 100

  const totalTVA = Object.values(vatByRate).reduce((s, v) => s + v, 0)

  return {
    subtotalHT: Math.round(subtotalHT * 100) / 100,
    globalDiscountAmount: Math.round(globalDiscountAmount * 100) / 100,
    totalHT: Math.round(totalHT * 100) / 100,
    vatByRate,
    totalTVA: Math.round(totalTVA * 100) / 100,
    totalTTC: Math.round((totalHT + totalTVA) * 100) / 100,
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface QuoteFormProps {
  defaultValues?: Partial<QuoteFormValues>
  onSaveDraft: (data: QuoteFormValues) => Promise<void>
  onSendToClient?: (data: QuoteFormValues) => Promise<void>
  isSaving?: boolean
  isSending?: boolean
  readOnly?: boolean
}

const VAT_RATES = [0, 5.5, 10, 20]
const today = new Date().toISOString().slice(0, 10)
const in30days = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

const DEFAULT_LINE = {
  description: '',
  quantity: 1,
  unitPrice: 0,
  vatRate: 20,
  discount: null,
  discountType: null,
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuoteForm({
  defaultValues,
  onSaveDraft,
  onSendToClient,
  isSaving,
  isSending,
  readOnly,
}: QuoteFormProps) {
  const { data: clients } = useClientsSelect()

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      issueDate: today,
      expiryDate: in30days,
      lines: [{ ...DEFAULT_LINE }],
      ...defaultValues,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  // Live totals — recomputed on every change
  const watchedLines = useWatch({ control, name: 'lines' })
  const watchedDiscount = useWatch({ control, name: 'discount' })
  const watchedDiscountType = useWatch({ control, name: 'discountType' })

  const totals = calcTotals(watchedLines ?? [], watchedDiscount, watchedDiscountType)

  return (
    <div className="space-y-6">

      {/* ── Section 1: Header info ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Informations générales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Client */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client <span className="text-red-500">*</span>
            </label>
            <select
              {...register('clientId')}
              disabled={readOnly}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            >
              <option value="">Sélectionner un client...</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
              ))}
            </select>
            {errors.clientId && <p className="mt-1 text-xs text-red-500">{errors.clientId.message}</p>}
          </div>

          {/* Title */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              {...register('title')}
              disabled={readOnly}
              placeholder="Ex: Développement site web, Prestation conseil..."
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
          </div>

          {/* Issue date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date d'émission <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('issueDate')}
              disabled={readOnly}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
            {errors.issueDate && <p className="mt-1 text-xs text-red-500">{errors.issueDate.message}</p>}
          </div>

          {/* Expiry date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date d'expiration <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('expiryDate')}
              disabled={readOnly}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
            {errors.expiryDate && <p className="mt-1 text-xs text-red-500">{errors.expiryDate.message}</p>}
          </div>
        </div>
      </div>

      {/* ── Section 2: Lines ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Lignes du devis</h2>
          {!readOnly && (
            <button
              type="button"
              onClick={() => append({ ...DEFAULT_LINE })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter une ligne
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {!readOnly && <th className="w-8 px-2" />}
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">Description</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase w-20">Qté</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase w-28">P.U. HT</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase w-24">TVA</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase w-32">Remise ligne</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase w-28">Sous-total HT</th>
                {!readOnly && <th className="w-10 px-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {fields.map((field, idx) => {
                const line = watchedLines?.[idx]
                const lineHT = calcLineSubtotal(
                  line?.quantity || 0,
                  line?.unitPrice || 0,
                  line?.discount,
                  line?.discountType
                )
                return (
                  <tr key={field.id} className="hover:bg-gray-50/50">
                    {!readOnly && (
                      <td className="px-2 py-2 text-gray-300">
                        <GripVertical className="w-4 h-4" />
                      </td>
                    )}

                    {/* Description */}
                    <td className="px-3 py-2">
                      <input
                        {...register(`lines.${idx}.description`)}
                        disabled={readOnly}
                        placeholder="Description de la prestation..."
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-transparent disabled:border-transparent"
                      />
                      {errors.lines?.[idx]?.description && (
                        <p className="text-xs text-red-500 mt-0.5">{errors.lines[idx]?.description?.message}</p>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        {...register(`lines.${idx}.quantity`)}
                        disabled={readOnly}
                        className="w-full px-2 py-1.5 text-sm text-center border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-transparent disabled:border-transparent"
                      />
                    </td>

                    {/* Unit price */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(`lines.${idx}.unitPrice`)}
                        disabled={readOnly}
                        className="w-full px-2 py-1.5 text-sm text-right border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-transparent disabled:border-transparent"
                      />
                    </td>

                    {/* VAT rate */}
                    <td className="px-3 py-2">
                      <select
                        {...register(`lines.${idx}.vatRate`)}
                        disabled={readOnly}
                        className="w-full px-2 py-1.5 text-sm text-center border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-transparent disabled:border-transparent"
                      >
                        {VAT_RATES.map((r) => (
                          <option key={r} value={r}>{r}%</option>
                        ))}
                      </select>
                    </td>

                    {/* Line discount */}
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          {...register(`lines.${idx}.discount`)}
                          disabled={readOnly}
                          placeholder="0"
                          className="w-16 px-2 py-1.5 text-sm text-center border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-transparent disabled:border-transparent"
                        />
                        <select
                          {...register(`lines.${idx}.discountType`)}
                          disabled={readOnly}
                          className="flex-1 px-1 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-transparent disabled:border-transparent"
                        >
                          <option value="">—</option>
                          <option value="PERCENTAGE">%</option>
                          <option value="FIXED">€</option>
                        </select>
                      </div>
                    </td>

                    {/* Line subtotal */}
                    <td className="px-3 py-2 text-right font-medium text-gray-900">
                      {formatCurrency(lineHT)}
                    </td>

                    {/* Remove */}
                    {!readOnly && (
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          disabled={fields.length === 1}
                          className="p-1 text-gray-300 hover:text-red-500 disabled:opacity-30 transition rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {errors.lines?.root && (
          <p className="px-6 py-2 text-sm text-red-500">{errors.lines.root.message}</p>
        )}
      </div>

      {/* ── Section 3: Global discount + Totals ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Global discount */}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Remise globale</h3>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('discount')}
                disabled={readOnly}
                placeholder="0"
                className="w-28 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              />
              <select
                {...register('discountType')}
                disabled={readOnly}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              >
                <option value="">Aucune</option>
                <option value="PERCENTAGE">Pourcentage (%)</option>
                <option value="FIXED">Montant fixe (€)</option>
              </select>
            </div>
          </div>

          {/* Live totals */}
          <div className="w-full md:w-80">
            <QuoteTotals
              totals={totals}
              discount={watchedDiscount}
              discountType={watchedDiscountType}
            />
          </div>
        </div>
      </div>

      {/* ── Section 4: Notes + Terms ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes internes
              <span className="ml-1 text-xs font-normal text-gray-400">(non visibles par le client)</span>
            </label>
            <textarea
              {...register('notes')}
              disabled={readOnly}
              rows={4}
              placeholder="Notes pour usage interne..."
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Conditions générales
            </label>
            <textarea
              {...register('termsAndConditions')}
              disabled={readOnly}
              rows={4}
              placeholder="Conditions de paiement, délais, garanties..."
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-50"
            />
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      {!readOnly && (
        <div className="flex items-center justify-end gap-3 pb-4">
          <button
            type="button"
            onClick={handleSubmit(onSaveDraft)}
            disabled={isSaving || isSending}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition disabled:opacity-60"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving ? 'Enregistrement...' : 'Enregistrer (brouillon)'}
          </button>

          {onSendToClient && (
            <button
              type="button"
              onClick={handleSubmit(onSendToClient)}
              disabled={isSaving || isSending}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-60"
            >
              {isSending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSending ? 'Envoi en cours...' : 'Envoyer au client'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
