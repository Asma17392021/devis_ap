import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/prisma'
import { success, badRequest, notFound } from '../utils/response'

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
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.quoteRequest.count({ where }),
  ])

  return success(res, {
    data: requests,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  })
}

// GET /api/requests/counts — unread badge counts
export async function getRequestCounts(req: Request, res: Response) {
  const [pending, inProgress] = await Promise.all([
    prisma.quoteRequest.count({ where: { status: 'PENDING' } }),
    prisma.quoteRequest.count({ where: { status: 'IN_PROGRESS' } }),
  ])
  return success(res, { pending, inProgress, total: pending + inProgress })
}

// PATCH /api/requests/:id — update status
const patchSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED']),
})

export async function updateRequestStatus(req: Request, res: Response) {
  const result = patchSchema.safeParse(req.body)
  if (!result.success) {
    return badRequest(res, 'Statut invalide', result.error.flatten().fieldErrors)
  }

  const request = await prisma.quoteRequest.update({
    where: { id: req.params.id },
    data: { status: result.data.status },
    include: {
      client: { select: { id: true, name: true, email: true } },
      attachments: true,
    },
  }).catch(() => null)

  if (!request) return notFound(res, 'Demande introuvable')

  return success(res, request)
}
