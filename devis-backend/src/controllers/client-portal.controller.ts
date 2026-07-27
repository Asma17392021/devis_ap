import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/prisma'
import { uploadFile, deleteFile, extractPathFromUrl } from '../services/storage.service'
import { success, created, noContent, badRequest, notFound, forbidden, serverError } from '../utils/response'

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]
const MAX_FILES = 8
const MAX_SIZE_MB = 15

// ─── GET /api/client-portal/quotes ───────────────────────────────────────────
export async function getMyQuotes(req: Request, res: Response) {
  const clientId = req.clientAccount!.clientId

  const quotes = await prisma.quote.findMany({
    where: { clientId },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      issueDate: true,
      expiryDate: true,
      signedAt: true,
      signatureToken: true,
      createdAt: true,
      lines: {
        select: { quantity: true, unitPrice: true, vatRate: true, discount: true, discountType: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const withTotals = quotes.map((q) => {
    let totalHT = 0
    for (const line of q.lines) {
      const gross = Number(line.quantity) * Number(line.unitPrice)
      const lineHT = line.discount && line.discountType
        ? line.discountType === 'PERCENTAGE'
          ? gross * (1 - Number(line.discount) / 100)
          : Math.max(0, gross - Number(line.discount))
        : gross
      totalHT += lineHT
    }
    return {
      id: q.id,
      number: q.number,
      title: q.title,
      status: q.status,
      issueDate: q.issueDate,
      expiryDate: q.expiryDate,
      signedAt: q.signedAt,
      signatureToken: q.signatureToken,
      createdAt: q.createdAt,
      totalHT: Math.round(totalHT * 100) / 100,
    }
  })

  return success(res, withTotals)
}

// ─── GET /api/client-portal/quote-requests ───────────────────────────────────
export async function getMyRequests(req: Request, res: Response) {
  const clientId = req.clientAccount!.clientId

  const requests = await prisma.quoteRequest.findMany({
    where: { clientId },
    include: {
      attachments: true,
      handledBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return success(res, requests)
}

// ─── POST /api/client-portal/quote-requests ──────────────────────────────────
const requestSchema = z.object({
  title: z.string().min(1, 'Titre requis').max(200),
  description: z.string().min(5, 'Description trop courte').max(5000),
  vehicleMake: z.string().max(100).optional(),
  vehicleModel: z.string().max(100).optional(),
  vehicleYear: z.coerce.number().int().min(1900).max(2100).optional(),
  vehicleVin: z.string().max(17).optional(),
  vehicleMileage: z.coerce.number().int().min(0).optional(),
})

export async function createRequest(req: Request, res: Response) {
  const result = requestSchema.safeParse(req.body)
  if (!result.success) {
    return badRequest(res, 'Données invalides', result.error.flatten().fieldErrors)
  }

  const clientId = req.clientAccount!.clientId

  const quoteRequest = await prisma.quoteRequest.create({
    data: { ...result.data, clientId },
  })

  return created(res, quoteRequest)
}

// ─── POST /api/client-portal/quote-requests/:id/attachments ─────────────────
export async function uploadRequestAttachment(req: Request, res: Response) {
  const { id } = req.params
  const clientId = req.clientAccount!.clientId

  if (!req.file) return badRequest(res, 'Aucun fichier fourni')

  if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
    return badRequest(res, `Type non autorisé. Formats acceptés : JPG, PNG, WEBP, HEIC, PDF`)
  }

  if (req.file.size > MAX_SIZE_MB * 1024 * 1024) {
    return badRequest(res, `Fichier trop volumineux (max ${MAX_SIZE_MB} Mo)`)
  }

  const request = await prisma.quoteRequest.findFirst({ where: { id, clientId } })
  if (!request) return notFound(res, 'Demande introuvable')

  // Check attachment count limit
  const count = await prisma.quoteRequestAttachment.count({ where: { requestId: id } })
  if (count >= MAX_FILES) {
    return badRequest(res, `Maximum ${MAX_FILES} fichiers par demande`)
  }

  try {
    const timestamp = Date.now()
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `quote-requests/${id}/${timestamp}_${safeName}`

    const fileUrl = await uploadFile(req.file.buffer, storagePath, req.file.mimetype)

    const attachment = await prisma.quoteRequestAttachment.create({
      data: {
        requestId: id,
        fileName: req.file.originalname,
        fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
    })

    return created(res, attachment)
  } catch (err) {
    console.error('Erreur upload:', err)
    return serverError(res, 'Erreur lors de l\'upload')
  }
}

// ─── DELETE /api/client-portal/quote-requests/:id/attachments/:attachmentId ──
export async function deleteRequestAttachment(req: Request, res: Response) {
  const { id, attachmentId } = req.params
  const clientId = req.clientAccount!.clientId

  const attachment = await prisma.quoteRequestAttachment.findFirst({
    where: { id: attachmentId, requestId: id, request: { clientId } },
  })

  if (!attachment) return notFound(res, 'Fichier introuvable')

  try {
    await deleteFile(extractPathFromUrl(attachment.fileUrl))
  } catch {
    // Non-fatal
  }

  await prisma.quoteRequestAttachment.delete({ where: { id: attachmentId } })

  return noContent(res)
}

// ─── GET /api/client-portal/notifications ────────────────────────────────────
export async function getMyNotifications(req: Request, res: Response) {
  const accountId = req.clientAccount!.accountId

  const notifications = await prisma.clientNotification.findMany({
    where: { accountId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const unreadCount = notifications.filter((n) => !n.readAt).length

  return success(res, { notifications, unreadCount })
}

// ─── PATCH /api/client-portal/notifications/read-all ─────────────────────────
export async function markAllNotificationsRead(req: Request, res: Response) {
  const accountId = req.clientAccount!.accountId

  await prisma.clientNotification.updateMany({
    where: { accountId, readAt: null },
    data: { readAt: new Date() },
  })

  return success(res, { message: 'Toutes les notifications marquées comme lues' })
}
