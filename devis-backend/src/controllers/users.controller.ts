import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/prisma'
import { hashPassword } from '../utils/password'
import { success, created, noContent, badRequest, notFound, conflict, forbidden } from '../utils/response'

const createUserSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe : 8 caractères minimum'),
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER']).default('MANAGER'),
  preferredLang: z.enum(['fr', 'en']).default('fr'),
})

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  preferredLang: z.enum(['fr', 'en']).optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['ADMIN', 'MANAGER']).optional(),
})

const USER_SELECT = {
  id: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  phone: true,
  preferredLang: true,
  createdAt: true,
  updatedAt: true,
}

// GET /api/users — ADMIN only
export async function listUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    select: USER_SELECT,
    orderBy: { createdAt: 'desc' },
  })

  return success(res, users)
}

// POST /api/users — ADMIN only
export async function createUser(req: Request, res: Response) {
  const result = createUserSchema.safeParse(req.body)
  if (!result.success) {
    return badRequest(res, 'Données invalides', result.error.flatten().fieldErrors)
  }

  const { email, password, firstName, lastName, phone, role, preferredLang } = result.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return conflict(res, 'Un utilisateur avec cet email existe déjà')
  }

  const passwordHash = await hashPassword(password)

  const user = await prisma.user.create({
    data: { email, passwordHash, firstName, lastName, phone, role, preferredLang },
    select: USER_SELECT,
  })

  return created(res, user)
}

// PATCH /api/users/:id — ADMIN or self
export async function updateUser(req: Request, res: Response) {
  const { id } = req.params
  const currentUser = req.user!

  // Non-admins can only edit themselves
  if (currentUser.role !== 'ADMIN' && currentUser.userId !== id) {
    return forbidden(res, 'Vous ne pouvez modifier que votre propre profil')
  }

  const result = updateUserSchema.safeParse(req.body)
  if (!result.success) {
    return badRequest(res, 'Données invalides', result.error.flatten().fieldErrors)
  }

  const { password, role, ...rest } = result.data

  // Only ADMINs can change roles
  const data: Record<string, unknown> = { ...rest }
  if (role && currentUser.role === 'ADMIN') {
    data.role = role
  }

  if (password) {
    data.passwordHash = await hashPassword(password)
  }

  if (rest.email) {
    const existing = await prisma.user.findFirst({
      where: { email: rest.email, NOT: { id } },
    })
    if (existing) {
      return conflict(res, 'Cet email est déjà utilisé')
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: USER_SELECT,
  }).catch(() => null)

  if (!user) return notFound(res, 'Utilisateur introuvable')

  return success(res, user)
}

// DELETE /api/users/:id — ADMIN only
export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params
  const currentUser = req.user!

  if (currentUser.userId === id) {
    return badRequest(res, 'Vous ne pouvez pas supprimer votre propre compte')
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return notFound(res, 'Utilisateur introuvable')

  await prisma.user.delete({ where: { id } })

  return noContent(res)
}
