import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('❌ Erreur non gérée:', err)

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: err.flatten().fieldErrors,
    })
  }

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Cette valeur existe déjà (contrainte d\'unicité).',
      })
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Ressource introuvable.',
      })
    }
  }

  // Default 500
  const message = err instanceof Error ? err.message : 'Erreur serveur interne'
  return res.status(500).json({ success: false, message })
}
