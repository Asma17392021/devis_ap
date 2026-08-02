import { Request, Response } from 'express'
import { prisma } from '../config/prisma'
import { success, noContent, notFound } from '../utils/response'

// GET /api/notifications
export async function listNotifications(req: Request, res: Response) {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.userId },
    include: {
      quote: {
        select: { id: true, number: true, title: true, status: true },
      },
      request: {
        select: { id: true, title: true, status: true },
      },
    },
    orderBy: [
      { readAt: 'asc' },    // unread first (null sorts before dates)
      { createdAt: 'desc' },
    ],
    take: 50,
  })

  const unreadCount = notifications.filter((n) => !n.readAt).length

  return success(res, { notifications, unreadCount })
}

// PATCH /api/notifications/:id/read
export async function markAsRead(req: Request, res: Response) {
  const notification = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  })

  if (!notification) return notFound(res, 'Notification introuvable')

  const updated = await prisma.notification.update({
    where: { id: req.params.id },
    data: { readAt: new Date() },
  })

  return success(res, updated)
}

// PATCH /api/notifications/read-all
export async function markAllAsRead(req: Request, res: Response) {
  await prisma.notification.updateMany({
    where: {
      userId: req.user!.userId,
      readAt: null,
    },
    data: { readAt: new Date() },
  })

  return noContent(res)
}
