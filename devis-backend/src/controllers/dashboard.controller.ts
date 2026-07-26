import { Request, Response } from 'express'
import { prisma } from '../config/prisma'
import { calculateTotals } from '../services/quote-calculations.service'
import { success, serverError } from '../utils/response'

export async function getStats(_req: Request, res: Response): Promise<void> {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Run independent queries in parallel
    const [
      quotesThisMonth,
      pendingQuotes,
      acceptedThisMonthWithLines,
      allDecided,
      recentQuotes,
      expiringQuotes,
    ] = await Promise.all([
      // Count quotes created this month (any status)
      prisma.quote.count({
        where: { createdAt: { gte: startOfMonth, lte: endOfMonth } },
      }),

      // Count SENT quotes (awaiting client response)
      prisma.quote.count({ where: { status: 'SENT' } }),

      // ACCEPTED quotes this month — need lines to compute TTC
      prisma.quote.findMany({
        where: {
          status: 'ACCEPTED',
          signedAt: { gte: startOfMonth, lte: endOfMonth },
        },
        include: {
          lines: true,
        },
      }),

      // All decided quotes for acceptance rate
      prisma.quote.groupBy({
        by: ['status'],
        where: { status: { in: ['ACCEPTED', 'REFUSED'] } },
        _count: { status: true },
      }),

      // Last 5 quotes (any status)
      prisma.quote.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          client: { select: { id: true, name: true } },
          lines: true,
        },
      }),

      // SENT quotes expiring in next 7 days
      prisma.quote.findMany({
        where: {
          status: 'SENT',
          expiryDate: {
            gte: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { expiryDate: 'asc' },
        include: {
          client: { select: { id: true, name: true } },
          lines: true,
        },
      }),
    ])

    // Compute signed revenue this month
    const signedRevenueThisMonth = acceptedThisMonthWithLines.reduce((sum, q) => {
      const totals = calculateTotals(q.lines, q.discount, q.discountType)
      return sum + totals.totalTTC
    }, 0)

    // Acceptance rate
    const acceptedCount = allDecided.find((g) => g.status === 'ACCEPTED')?._count.status ?? 0
    const refusedCount = allDecided.find((g) => g.status === 'REFUSED')?._count.status ?? 0
    const decidedTotal = acceptedCount + refusedCount
    const acceptanceRate = decidedTotal > 0 ? Math.round((acceptedCount / decidedTotal) * 100) : 0

    // Shape recent quotes
    const recentQuotesFormatted = recentQuotes.map((q) => {
      const totals = calculateTotals(q.lines, q.discount, q.discountType)
      return {
        id: q.id,
        number: q.number,
        status: q.status,
        client: q.client,
        totalTTC: totals.totalTTC,
        issueDate: q.issueDate,
        expiryDate: q.expiryDate,
      }
    })

    // Shape expiring quotes
    const expiringQuotesFormatted = expiringQuotes.map((q) => {
      const totals = calculateTotals(q.lines, q.discount, q.discountType)
      return {
        id: q.id,
        number: q.number,
        client: q.client,
        totalTTC: totals.totalTTC,
        expiryDate: q.expiryDate,
      }
    })

    success(res, {
      quotesThisMonth,
      pendingQuotes,
      signedRevenueThisMonth: Math.round(signedRevenueThisMonth * 100) / 100,
      acceptanceRate,
      recentQuotes: recentQuotesFormatted,
      expiringQuotes: expiringQuotesFormatted,
    })
  } catch (err) {
    serverError(res, err)
  }
}
