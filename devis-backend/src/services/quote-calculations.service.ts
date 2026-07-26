import { DiscountType } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

interface LineInput {
  quantity: Decimal | number
  unitPrice: Decimal | number
  vatRate: Decimal | number
  discount?: Decimal | number | null
  discountType?: DiscountType | null
}

export interface QuoteTotals {
  subtotalHT: number          // Sum of all line subtotals before global discount
  globalDiscountAmount: number // Global discount amount
  totalHT: number             // subtotalHT - globalDiscountAmount
  vatByRate: Record<string, number> // e.g. { "20": 240.00, "10": 15.00 }
  totalTVA: number            // Sum of all VAT
  totalTTC: number            // totalHT + totalTVA
}

function toNumber(val: Decimal | number | null | undefined): number {
  if (val === null || val === undefined) return 0
  return typeof val === 'number' ? val : parseFloat(val.toString())
}

function applyDiscount(amount: number, discount: number | null | undefined, type: DiscountType | null | undefined): number {
  if (!discount || !type) return amount
  if (type === 'PERCENTAGE') {
    return amount * (1 - discount / 100)
  }
  return Math.max(0, amount - discount)
}

/**
 * Calculate a single line's HT subtotal after per-line discount.
 */
export function calculateLineSubtotal(line: LineInput): number {
  const qty = toNumber(line.quantity)
  const price = toNumber(line.unitPrice)
  const gross = qty * price
  return applyDiscount(gross, toNumber(line.discount), line.discountType)
}

/**
 * Calculate full quote totals from lines + optional global discount.
 * All calculations are done server-side only.
 */
export function calculateTotals(
  lines: LineInput[],
  globalDiscount?: Decimal | number | null,
  globalDiscountType?: DiscountType | null
): QuoteTotals {
  // 1. Sum of all line subtotals (HT, after per-line discounts)
  const subtotalHT = lines.reduce((sum, line) => sum + calculateLineSubtotal(line), 0)

  // 2. Global discount
  const globalDiscountNum = toNumber(globalDiscount)
  let globalDiscountAmount = 0
  if (globalDiscountNum > 0 && globalDiscountType) {
    if (globalDiscountType === 'PERCENTAGE') {
      globalDiscountAmount = subtotalHT * (globalDiscountNum / 100)
    } else {
      globalDiscountAmount = Math.min(globalDiscountNum, subtotalHT)
    }
  }

  const totalHT = subtotalHT - globalDiscountAmount

  // 3. VAT grouped by rate (applied proportionally after global discount)
  // Ratio used to apply global discount proportionally across VAT groups
  const ratio = subtotalHT > 0 ? totalHT / subtotalHT : 1

  const vatByRate: Record<string, number> = {}
  for (const line of lines) {
    const lineSubtotal = calculateLineSubtotal(line) * ratio
    const vatRate = toNumber(line.vatRate)
    const vatAmount = lineSubtotal * (vatRate / 100)

    const rateKey = vatRate.toFixed(1)
    vatByRate[rateKey] = (vatByRate[rateKey] ?? 0) + vatAmount
  }

  // Round VAT values
  for (const key of Object.keys(vatByRate)) {
    vatByRate[key] = Math.round(vatByRate[key] * 100) / 100
  }

  const totalTVA = Object.values(vatByRate).reduce((sum, v) => sum + v, 0)
  const totalTTC = totalHT + totalTVA

  return {
    subtotalHT: Math.round(subtotalHT * 100) / 100,
    globalDiscountAmount: Math.round(globalDiscountAmount * 100) / 100,
    totalHT: Math.round(totalHT * 100) / 100,
    vatByRate,
    totalTVA: Math.round(totalTVA * 100) / 100,
    totalTTC: Math.round(totalTTC * 100) / 100,
  }
}
