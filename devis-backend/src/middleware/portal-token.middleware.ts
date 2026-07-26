import { Request, Response, NextFunction } from 'express'
import { Quote, Client, QuoteLine, Attachment } from '@prisma/client'
import { prisma } from '../config/prisma'
import { notFound, badRequest } from '../utils/response'

// Extend Request to carry the validated quote
type QuoteWithRelations = Quote & {
  client: Client
  lines: QuoteLine[]
  attachments: Attachment[]
}

declare global {
  namespace Express {
    interface Request {
      portalQuote?: QuoteWithRelations
    }
  }
}

/**
 * Validates the portal token from URL params.
 * - Token must exist in DB
 * - Quote must not be expired (expiryDate >= today)
 * Attaches `req.portalQuote` for downstream handlers.
 */
export async function validatePortalToken(req: Request, res: Response, next: NextFunction) {
  const { token } = req.params

  if (!token) {
    return badRequest(res, 'Token manquant')
  }

  const quote = await prisma.quote.findFirst({
    where: { signatureToken: token },
    include: {
      client: true,
      lines: { orderBy: { position: 'asc' } },
      attachments: true,
    },
  })

  if (!quote) {
    return notFound(res, 'Devis introuvable ou lien invalide')
  }

  // Check expiry — use start of today to allow same-day access
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (new Date(quote.expiryDate) < today) {
    return badRequest(res, 'Ce devis a expiré et ne peut plus être consulté via ce lien')
  }

  req.portalQuote = quote as QuoteWithRelations
  next()
}
