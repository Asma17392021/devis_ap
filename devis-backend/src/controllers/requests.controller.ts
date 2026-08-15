import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/prisma'
import { sendRequestRejection, sendRequestStatusUpdate } from '../services/email.service'
import { success, badRequest, notFound } from '../utils/response'
import { env } from '../config/env'

// GET /api/requests
export async function listRequests(req: Request, res: Response) {
  const { status, search, page = '1', limit = '20' } = req.query

  const pageNum = Math.max(1, parseInt(page as string, 10))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)))

  const where: Record<string, unknown> = {}

  if (status && status !== 'ALL') {
    where.status = status
  }

  if (search) {
    where.OR = [
      { title: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
      { vehicleMake: { contains: search as string, mode: 'insensitive' } },
      { vehicleModel: { contains: search as string, mode: 'insensitive' } },
      { client: { name: { contains: search as string, mode: 'insensitive' } } },
    ]
  }

  const [requests, total] = await Promise.all([
    prisma.quoteRequest.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        attachments: true,
        handledBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.quoteRequest.count({ where }),
  ])

  return success(res, {
    data: requests,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  })
}

// GET /api/requests/counts
export async function getRequestCounts(req: Request, res: Response) {
  const [pending, inProgress] = await Promise.all([
    prisma.quoteRequest.count({ where: { status: 'PENDING' } }),
    prisma.quoteRequest.count({ where: { status: 'IN_PROGRESS' } }),
  ])
  return success(res, { pending, inProgress, total: pending + inProgress })
}

// PATCH /api/requests/:id
const patchSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED']),
  rejectionReason: z.string().max(500).optional(),
})

export async function updateRequestStatus(req: Request, res: Response) {
  const result = patchSchema.safeParse(req.body)
  if (!result.success) {
    return badRequest(res, 'Données invalides', result.error.flatten().fieldErrors)
  }

  const { status, rejectionReason } = result.data

  if (status === 'REJECTED' && !rejectionReason?.trim()) {
    return badRequest(res, 'Le motif de refus est obligatoire')
  }

  const request = await prisma.quoteRequest.update({
    where: { id: req.params.id },
    data: {
      status,
      rejectionReason: status === 'REJECTED' ? rejectionReason : null,
      handledById: req.user!.userId,
    },
    include: {
      client: { select: { id: true, name: true, email: true, account: { select: { id: true } } } },
      attachments: true,
      handledBy: { select: { id: true, firstName: true, lastName: true } },
    },
  }).catch(() => null)

  if (!request) return notFound(res, 'Demande introuvable')

  const clientEmail = request.client.email
  const clientName = request.client.name
  const accountId = request.client.account?.id
  const portalUrl = `${env.FRONTEND_URL}/client/requests`
  const companyName = 'Autoclick Devis'
  const handledByName = request.handledBy
    ? `${request.handledBy.firstName} ${request.handledBy.lastName}`
    : undefined

  // ── Create client in-app notification ────────────────────────────────────
  if (accountId) {
    let message = ''
    let type = ''

    if (status === 'REJECTED') {
      type = 'REQUEST_REJECTED'
      message = `Votre demande "${request.title}" a été refusée${rejectionReason ? ` : ${rejectionReason}` : ''}.`
    } else if (status === 'IN_PROGRESS') {
      type = 'REQUEST_IN_PROGRESS'
      message = `Votre demande "${request.title}" est en cours de traitement.`
    } else if (status === 'COMPLETED') {
      type = 'REQUEST_COMPLETED'
      message = `Votre demande "${request.title}" a été traitée. Un devis va vous être envoyé.`
    }

    if (type) {
      await prisma.clientNotification.create({
        data: { type, message, accountId },
      }).catch(console.error)
    }
  }

  // ── Send email (fire-and-forget) ──────────────────────────────────────────
  if (status === 'REJECTED') {
    sendRequestRejection({
      clientEmail,
      clientName,
      requestTitle: request.title,
      rejectionReason,
      handledByName,
      companyName,
      portalUrl,
    })
  } else if (status === 'IN_PROGRESS' || status === 'COMPLETED') {
    sendRequestStatusUpdate({
      clientEmail,
      clientName,
      requestTitle: request.title,
      newStatus: status,
      handledByName,
      companyName,
      portalUrl,
    })
  }

  return success(res, request)
}
