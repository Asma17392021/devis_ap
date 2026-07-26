import cron from 'node-cron'
import { prisma } from '../config/prisma'
import { notifyManagers } from '../services/notification.service'

/**
 * Expiration cron job — runs every night at 00:00.
 *
 * Two actions:
 *  1. Pass SENT quotes with expiryDate < today → EXPIRED + notify managers
 *  2. Detect quotes expiring in exactly 3 days → notify managers (QUOTE_EXPIRING)
 */
export function startExpirationJob() {
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ [Cron] Vérification des devis expirés et bientôt expirés...')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const inThreeDays = new Date(today)
    inThreeDays.setDate(inThreeDays.getDate() + 3)

    try {
      await Promise.all([
        expireOverdueQuotes(today),
        notifyExpiringQuotes(today, inThreeDays),
      ])
    } catch (err) {
      console.error('❌ [Cron] Erreur lors du traitement des expirations:', err)
    }
  })

  console.log('✅ Cron job d\'expiration enregistré (00:00 chaque nuit)')
}

// ─── Expire overdue quotes ────────────────────────────────────────────────────

async function expireOverdueQuotes(today: Date): Promise<void> {
  // Find all SENT quotes with expiryDate strictly before today
  const overdueQuotes = await prisma.quote.findMany({
    where: {
      status: 'SENT',
      expiryDate: { lt: today },
    },
    include: { client: { select: { name: true } } },
  })

  if (overdueQuotes.length === 0) {
    console.log('✅ [Cron] Aucun devis à expirer')
    return
  }

  // Batch update to EXPIRED
  await prisma.quote.updateMany({
    where: { id: { in: overdueQuotes.map((q) => q.id) } },
    data: { status: 'EXPIRED' },
  })

  console.log(`🔴 [Cron] ${overdueQuotes.length} devis expiré(s)`)

  // Notify managers for each expired quote
  for (const quote of overdueQuotes) {
    await notifyManagers({
      type: 'QUOTE_EXPIRED',
      quoteId: quote.id,
      quoteNumber: quote.number,
      clientName: quote.client.name,
    }).catch((err) => console.error(`[Cron] Notification EXPIRED échouée pour ${quote.number}:`, err))
  }
}

// ─── Notify expiring soon (J-3) ──────────────────────────────────────────────

async function notifyExpiringQuotes(today: Date, inThreeDays: Date): Promise<void> {
  // Quotes SENT that expire exactly on the date 3 days from now
  // Using gte today+3 and lt today+4 to match "exactly 3 days"
  const nextDay = new Date(inThreeDays)
  nextDay.setDate(nextDay.getDate() + 1)

  const expiringQuotes = await prisma.quote.findMany({
    where: {
      status: 'SENT',
      expiryDate: {
        gte: inThreeDays,
        lt: nextDay,
      },
    },
    include: { client: { select: { name: true } } },
  })

  if (expiringQuotes.length === 0) {
    console.log('✅ [Cron] Aucun devis expirant dans 3 jours')
    return
  }

  console.log(`⏰ [Cron] ${expiringQuotes.length} devis expirant dans 3 jours`)

  for (const quote of expiringQuotes) {
    await notifyManagers({
      type: 'QUOTE_EXPIRING',
      quoteId: quote.id,
      quoteNumber: quote.number,
      clientName: quote.client.name,
    }).catch((err) => console.error(`[Cron] Notification EXPIRING échouée pour ${quote.number}:`, err))
  }
}
