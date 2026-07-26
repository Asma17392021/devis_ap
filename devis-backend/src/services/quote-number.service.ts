import { prisma } from '../config/prisma'

/**
 * Generate the next quote number for the current year.
 * Format: QT-YYYY-NNN (e.g. QT-2026-001)
 *
 * Uses a serializable transaction to prevent race conditions
 * when multiple requests arrive simultaneously.
 */
export async function generateQuoteNumber(): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const year = new Date().getFullYear()
    const prefix = `QT-${year}-`

    // Find the highest existing number for this year
    const last = await tx.quote.findFirst({
      where: { number: { startsWith: prefix } },
      orderBy: { number: 'desc' },
      select: { number: true },
    })

    let sequence = 1
    if (last) {
      // Extract numeric part: "QT-2026-042" → 42
      const parts = last.number.split('-')
      const lastSeq = parseInt(parts[2], 10)
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1
      }
    }

    return `${prefix}${String(sequence).padStart(3, '0')}`
  }, { isolationLevel: 'Serializable' })
}
