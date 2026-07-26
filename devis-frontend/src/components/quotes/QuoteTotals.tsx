import { formatCurrency } from '@/lib/utils'

export interface Totals {
  subtotalHT: number
  globalDiscountAmount: number
  totalHT: number
  vatByRate: Record<string, number>
  totalTVA: number
  totalTTC: number
}

interface QuoteTotalsProps {
  totals: Totals
  discount?: number | null
  discountType?: 'PERCENTAGE' | 'FIXED' | null
}

export function QuoteTotals({ totals, discount, discountType }: QuoteTotalsProps) {
  const discountLabel = discount && discountType
    ? discountType === 'PERCENTAGE' ? `${discount}%` : formatCurrency(discount)
    : null

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden w-full max-w-sm ml-auto">
      <table className="w-full text-sm">
        <tbody>
          <tr className="border-b border-gray-100">
            <td className="px-4 py-2.5 text-gray-600">Sous-total HT</td>
            <td className="px-4 py-2.5 text-right font-medium text-gray-900">
              {formatCurrency(totals.subtotalHT)}
            </td>
          </tr>

          {totals.globalDiscountAmount > 0 && (
            <tr className="border-b border-gray-100">
              <td className="px-4 py-2.5 text-gray-600">
                Remise globale {discountLabel && <span className="text-gray-400">({discountLabel})</span>}
              </td>
              <td className="px-4 py-2.5 text-right font-medium text-red-600">
                −{formatCurrency(totals.globalDiscountAmount)}
              </td>
            </tr>
          )}

          <tr className="border-b border-gray-100">
            <td className="px-4 py-2.5 text-gray-600">Total HT</td>
            <td className="px-4 py-2.5 text-right font-medium text-gray-900">
              {formatCurrency(totals.totalHT)}
            </td>
          </tr>

          {Object.entries(totals.vatByRate)
            .filter(([, v]) => v > 0)
            .map(([rate, amount]) => (
              <tr key={rate} className="border-b border-gray-100">
                <td className="px-4 py-2.5 text-gray-500">TVA {rate}%</td>
                <td className="px-4 py-2.5 text-right text-gray-600">{formatCurrency(amount)}</td>
              </tr>
            ))}

          <tr className="bg-blue-600">
            <td className="px-4 py-3 text-white font-bold">Total TTC</td>
            <td className="px-4 py-3 text-right text-white font-bold text-base">
              {formatCurrency(totals.totalTTC)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
