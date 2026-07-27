import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/prisma'
import { hashPassword, comparePassword } from '../utils/password'
import {
  generateClientAccessToken,
  generateClientRefreshToken,
  verifyClientRefreshToken,
} from '../utils/jwt'
import { success, created, badRequest, unauthorized, conflict, notFound } from '../utils/response'

const REFRESH_COOKIE = 'client_rt'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'strict') as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
}

const registerSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe minimum 8 caractères'),
  phone: z.string().optional(),
  company: z.string().optional(), // nom de la société/client
})

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

// POST /api/client-auth/register
export async function clientRegister(req: Request, res: Response) {
  const result = registerSchema.safeParse(req.body)
  if (!result.success) {
    return badRequest(res, 'Données invalides', result.error.flatten().fieldErrors)
  }

  const { firstName, lastName, email, password, phone, company } = result.data

  // Check if account already exists
  const existing = await prisma.clientAccount.findUnique({ where: { email } })
  if (existing) {
    return conflict(res, 'Un compte avec cet email existe déjà')
  }

  const passwordHash = await hashPassword(password)

  // Create Client + ClientAccount in one transaction
  const account = await prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        name: company || `${firstName} ${lastName}`,
        email,
        phone: phone ?? null,
      },
    })

    return tx.clientAccount.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        clientId: client.id,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        clientId: true,
        client: { select: { id: true, name: true, email: true } },
      },
    })
  })

  const payload = { clientId: account.clientId, accountId: account.id, email: account.email, type: 'client' as const }
  const accessToken = generateClientAccessToken(payload)
  const refreshToken = generateClientRefreshToken(payload)

  res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS)

  return created(res, {
    accessToken,
    account: {
      id: account.id,
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
      clientId: account.clientId,
      clientName: account.client.name,
    },
  })
}

// POST /api/client-auth/login
export async function clientLogin(req: Request, res: Response) {
  const result = loginSchema.safeParse(req.body)
  if (!result.success) {
    return badRequest(res, 'Données invalides', result.error.flatten().fieldErrors)
  }

  const { email, password } = result.data

  const account = await prisma.clientAccount.findUnique({
    where: { email },
    include: { client: { select: { id: true, name: true } } },
  })

  if (!account) return unauthorized(res, 'Email ou mot de passe incorrect')

  const valid = await comparePassword(password, account.passwordHash)
  if (!valid) return unauthorized(res, 'Email ou mot de passe incorrect')

  const payload = { clientId: account.clientId, accountId: account.id, email: account.email, type: 'client' as const }
  const accessToken = generateClientAccessToken(payload)
  const refreshToken = generateClientRefreshToken(payload)

  res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS)

  return success(res, {
    accessToken,
    account: {
      id: account.id,
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
      clientId: account.clientId,
      clientName: account.client.name,
    },
  })
}

// POST /api/client-auth/refresh
export async function clientRefresh(req: Request, res: Response) {
  const token = req.cookies[REFRESH_COOKIE] as string | undefined

  if (!token) return unauthorized(res, 'Refresh token manquant')

  try {
    const payload = verifyClientRefreshToken(token)

    const account = await prisma.clientAccount.findUnique({ where: { id: payload.accountId } })
    if (!account) return unauthorized(res, 'Compte introuvable')

    const newPayload = { clientId: account.clientId, accountId: account.id, email: account.email, type: 'client' as const }
    const newAccessToken = generateClientAccessToken(newPayload)
    const newRefreshToken = generateClientRefreshToken(newPayload)

    res.cookie(REFRESH_COOKIE, newRefreshToken, COOKIE_OPTIONS)
    return success(res, { accessToken: newAccessToken })
  } catch {
    res.clearCookie(REFRESH_COOKIE)
    return unauthorized(res, 'Refresh token invalide ou expiré')
  }
}

// POST /api/client-auth/logout
export async function clientLogout(_req: Request, res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/' })
  return success(res, { message: 'Déconnecté avec succès' })
}

// GET /api/client-auth/me
export async function clientMe(req: Request, res: Response) {
  const account = await prisma.clientAccount.findUnique({
    where: { id: req.clientAccount!.accountId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      clientId: true,
      createdAt: true,
      client: { select: { id: true, name: true, email: true, phone: true, address: true, city: true } },
    },
  })

  if (!account) return notFound(res, 'Compte introuvable')

  return success(res, account)
}
