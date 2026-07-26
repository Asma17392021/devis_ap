import { NotificationType } from '@prisma/client'
import { prisma } from '../config/prisma'
import { sendNotificationToManagers, NotifyManagersPayload } from './fcm.service'

/**
 * Persist a notification record in the database for a specific user.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  quoteId: string,
  message: string
): Promise<void> {
  await prisma.notification.create({
    data: { userId, type, quoteId, message },
  })
}

/**
 * Notify all ADMIN and MANAGER users:
 *  1. Send FCM push notification
 *  2. Persist a notification record in DB for each user
 */
export async function notifyManagers(payload: NotifyManagersPayload): Promise<void> {
  const { type, quoteId, quoteNumber, clientName } = payload

  // 1. Send FCM push (fire-and-forget, non-fatal)
  await sendNotificationToManagers(payload)

  // 2. Persist notification for each ADMIN/MANAGER in DB
  const managers = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'MANAGER'] } },
    select: { id: true },
  })

  const messages: Record<NotificationType, string> = {
    QUOTE_SENT: `Devis ${quoteNumber} envoyé à ${clientName}`,
    QUOTE_ACCEPTED: `${clientName} a accepté le devis ${quoteNumber}`,
    QUOTE_REFUSED: `${clientName} a refusé le devis ${quoteNumber}`,
    QUOTE_EXPIRING: `Le devis ${quoteNumber} (${clientName}) expire dans 3 jours`,
    QUOTE_EXPIRED: `Le devis ${quoteNumber} (${clientName}) a expiré`,
    QUOTE_REQUEST_RECEIVED: `${clientName} a soumis une nouvelle demande de devis`,
  }

  await prisma.notification.createMany({
    data: managers.map((m) => ({
      userId: m.id,
      type,
      quoteId,
      message: messages[type],
    })),
    skipDuplicates: true,
  })
}
