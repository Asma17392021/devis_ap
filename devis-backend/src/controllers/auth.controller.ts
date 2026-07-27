import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/prisma'
import { comparePassword, hashPassword } from '../utils/password'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt'
import {
  success,
  unauthorized,
  badRequest,
  notFound,
} from '../utils/response'

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

const activateSchema = z.object({
  token: z.string().min(1, 'Lien invalide'),
  password: z.string().min(8, 'Mot de passe : 8 caractères minimum'),
})

const REFRESH_COOKIE = 'refresh_token'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  // 'none' is required cross-site (frontend on vercel.app, API on onrender.com);
  // it must be paired with secure:true, which production already sets.
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'strict') as 'none' | 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
}

// POST /api/auth/login
export async function login(req: Request, res: Response) {
  const result = loginSchema.safeParse(req.body)
  if (!result.success) {
    return badRequest(res, 'Données invalides', result.error.flatten().fieldErrors)
  }

  const { email, password } = result.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.passwordHash) {
    return unauthorized(res, 'Email ou mot de passe incorrect')
  }

  const valid = await comparePassword(password, user.passwordHash)
  if (!valid) {
    return unauthorized(res, 'Email ou mot de passe incorrect')
  }

  const payload = { userId: user.id, email: user.email, role: user.role }
  const accessToken = generateAccessToken(payload)
  const refreshToken = generateRefreshToken(payload)

  res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS)

  return success(res, {
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      preferredLang: user.preferredLang,
    },
  })
}

// POST /api/auth/activate — sets the password for an invited (ADMIN/MANAGER) account
export async function activate(req: Request, res: Response) {
  const result = activateSchema.safeParse(req.body)
  if (!result.success) {
    return badRequest(res, 'Données invalides', result.error.flatten().fieldErrors)
  }

  const { token, password } = result.data

  const user = await prisma.user.findUnique({ where: { activationToken: token } })
  if (!user || !user.activationTokenExpiresAt || user.activationTokenExpiresAt < new Date()) {
    return badRequest(res, 'Ce lien d\'activation est invalide ou expiré')
  }

  const passwordHash = await hashPassword(password)

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, activationToken: null, activationTokenExpiresAt: null },
  })

  const payload = { userId: updated.id, email: updated.email, role: updated.role }
  const accessToken = generateAccessToken(payload)
  const refreshToken = generateRefreshToken(payload)

  res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS)

  return success(res, {
    accessToken,
    user: {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      firstName: updated.firstName,
      lastName: updated.lastName,
      preferredLang: updated.preferredLang,
    },
  })
}

// POST /api/auth/refresh
export async function refresh(req: Request, res: Response) {
  const token = req.cookies[REFRESH_COOKIE] as string | undefined

  if (!token) {
    return unauthorized(res, 'Refresh token manquant')
  }

  try {
    const payload = verifyRefreshToken(token)

    // Verify user still exists
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) {
      return unauthorized(res, 'Utilisateur introuvable')
    }

    const newPayload = { userId: user.id, email: user.email, role: user.role }
    const newAccessToken = generateAccessToken(newPayload)
    const newRefreshToken = generateRefreshToken(newPayload)

    // Rotate refresh token
    res.cookie(REFRESH_COOKIE, newRefreshToken, COOKIE_OPTIONS)

    return success(res, { accessToken: newAccessToken })
  } catch {
    res.clearCookie(REFRESH_COOKIE)
    return unauthorized(res, 'Refresh token invalide ou expiré')
  }
}

// POST /api/auth/logout
export async function logout(_req: Request, res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/' })
  return success(res, { message: 'Déconnecté avec succès' })
}

// GET /api/auth/me
export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      phone: true,
      preferredLang: true,
      createdAt: true,
    },
  })

  if (!user) {
    return notFound(res, 'Utilisateur introuvable')
  }

  return success(res, user)
}

// PATCH /api/auth/me — update own profile (preferredLang, etc.)
export async function updateMe(req: Request, res: Response) {
  const allowed = ['firstName', 'lastName', 'phone', 'preferredLang'] as const
  const update: Record<string, unknown> = {}

  for (const key of allowed) {
    if (key in req.body) update[key] = req.body[key]
  }

  if (Object.keys(update).length === 0) {
    return badRequest(res, 'Aucun champ valide fourni')
  }

  if (update.preferredLang && !['fr', 'en'].includes(update.preferredLang as string)) {
    return badRequest(res, 'preferredLang doit être "fr" ou "en"')
  }

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: update,
    select: {
      id: true, email: true, role: true,
      firstName: true, lastName: true,
      phone: true, preferredLang: true,
    },
  })

  return success(res, user)
}

// PATCH /api/auth/fcm-token
export async function updateFcmToken(req: Request, res: Response) {
  const { fcmToken } = req.body

  if (!fcmToken || typeof fcmToken !== 'string') {
    return badRequest(res, 'fcmToken requis')
  }

  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { fcmToken },
  })

  return success(res, { message: 'FCM token mis à jour' })
}
