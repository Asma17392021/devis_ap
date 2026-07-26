import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/prisma'
import { success, created, noContent, badRequest, notFound, conflict } from '../utils/response'

const clientSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().default('FR'),
  siret: z.string().optional().nullable(),
  vatNumber: z.string().optional().nullable(),
})

const updateClientSchema = clientSchema.partial()

const CLIENT_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  postalCode: true,
  country: true,
  siret: true,
  vatNumber: true,
  createdAt: true,
  updatedAt: true,
}

// GET /api/clients
export async function listClients(req: Request, res: Response) {
  const { search, page = '1', limit = '20' } = req.query

  const pageNum = Math.max(1, parseInt(page as string, 10))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)))
  const skip = (pageNum - 1) * limitNum

  const where = search
    ? {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' as const } },
          { email: { contains: search as string, mode: 'insensitive' as const } },
          { siret: { contains: search as string, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      select: CLIENT_SELECT,
      orderBy: { name: 'asc' },
      skip,
      take: limitNum,
    }),
    prisma.client.count({ where }),
  ])

  return success(res, {
    data: clients,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  })
}

// POST /api/clients
export async function createClient(req: Request, res: Response) {
  const result = clientSchema.safeParse(req.body)
  if (!result.success) {
    return badRequest(res, 'Données invalides', result.error.flatten().fieldErrors)
  }

  const client = await prisma.client.create({
    data: result.data,
    select: CLIENT_SELECT,
  })

  return created(res, client)
}

// GET /api/clients/:id
export async function getClient(req: Request, res: Response) {
  const client = await prisma.client.findUnique({
    where: { id: req.params.id },
    select: {
      ...CLIENT_SELECT,
      _count: { select: { quotes: true } },
    },
  })

  if (!client) return notFound(res, 'Client introuvable')

  return success(res, client)
}

// PATCH /api/clients/:id
export async function updateClient(req: Request, res: Response) {
  const result = updateClientSchema.safeParse(req.body)
  if (!result.success) {
    return badRequest(res, 'Données invalides', result.error.flatten().fieldErrors)
  }

  const client = await prisma.client.update({
    where: { id: req.params.id },
    data: result.data,
    select: CLIENT_SELECT,
  }).catch(() => null)

  if (!client) return notFound(res, 'Client introuvable')

  return success(res, client)
}

// DELETE /api/clients/:id — ADMIN only
export async function deleteClient(req: Request, res: Response) {
  const { id } = req.params

  const client = await prisma.client.findUnique({
    where: { id },
    include: { _count: { select: { quotes: true } } },
  })

  if (!client) return notFound(res, 'Client introuvable')

  if (client._count.quotes > 0) {
    return conflict(res, `Impossible de supprimer : ce client a ${client._count.quotes} devis associé(s)`)
  }

  await prisma.client.delete({ where: { id } })

  return noContent(res)
}
