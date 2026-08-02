import { NotificationType } from '@prisma/client'
import { prisma } from '../config/prisma'

// FCM message titles & bodies — bilingual
const FCM_MESSAGES: Record<NotificationType, { title: string; body: (quoteNumber: string, clientName: string) => string }> = {
  QUOTE_SENT: {
    title: '📤 Devis envoyé',
    body: (n, c) => `Devis ${n} envoyé à ${c}`,
  },
  QUOTE_ACCEPTED: {
    title: '✅ Devis accepté',
    body: (n, c) => `${c} a accepté le devis ${n}`,
  },
  QUOTE_REFUSED: {
    title: '❌ Devis refusé',
    body: (n, c) => `${c} a refusé le devis ${n}`,
  },
  QUOTE_EXPIRING: {
    title: '⏰ Devis bientôt expiré',
    body: (n, c) => `Le devis ${n} (${c}) expire dans 3 jours`,
  },
  QUOTE_EXPIRED: {
    title: '🔴 Devis expiré',
    body: (n, c) => `Le devis ${n} (${c}) a expiré`,
  },
  QUOTE_REQUEST_RECEIVED: {
    title: '📋 Nouvelle demande de devis',
    body: (n, c) => `${c} a soumis une nouvelle demande de devis`,
  },
}

export interface NotifyManagersPayload {
  type: NotificationType
  quoteId?: string
  requestId?: string
  quoteNumber: string
  clientName: string
}

/**
 * Send a FCM push notification to all ADMIN and MANAGER users
 * who have a registered fcmToken.
 *
 * Automatically cleans up invalid tokens from the database.
 * Gracefully degrades if Firebase is not configured.
 */
export async function sendNotificationToManagers(payload: NotifyManagersPayload): Promise<void> {
  const { type, quoteId, requestId, quoteNumber, clientName } = payload

  // Fetch all managers/admins with a valid FCM token
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['ADMIN', 'MANAGER'] },
      fcmToken: { not: null },
    },
    select: { id: true, fcmToken: true },
  })

  if (users.length === 0) return

  const tokens = users.map((u) => u.fcmToken as string)
  const { title, body } = FCM_MESSAGES[type]
  const bodyText = body(quoteNumber, clientName)

  try {
    // Lazy-import to avoid crashing on startup if Firebase is not configured
    const { getMessaging } = await import('../config/firebase')
    const messaging = getMessaging()

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body: bodyText },
      data: {
        ...(quoteId ? { quoteId } : {}),
        ...(requestId ? { requestId } : {}),
        type,
        quoteNumber,
        clientName,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        priority: 'high',
        notification: { sound: 'default', clickAction: 'FLUTTER_NOTIFICATION_CLICK' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    })

    // Clean up invalid tokens
    const invalidTokenUserIds: string[] = []
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errCode = resp.error?.code
        if (
          errCode === 'messaging/invalid-registration-token' ||
          errCode === 'messaging/registration-token-not-registered'
        ) {
          invalidTokenUserIds.push(users[idx].id)
        }
      }
    })

    if (invalidTokenUserIds.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: invalidTokenUserIds } },
        data: { fcmToken: null },
      })
      console.log(`🧹 FCM: ${invalidTokenUserIds.length} token(s) invalide(s) supprimé(s)`)
    }

    const successCount = response.responses.filter((r) => r.success).length
    console.log(`📱 FCM [${type}]: ${successCount}/${tokens.length} notification(s) envoyée(s)`)
  } catch (err) {
    // FCM failure is non-fatal — log and continue
    console.error(`⚠️ FCM envoi échoué pour [${type}]:`, err)
  }
}
