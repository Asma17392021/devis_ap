import { Request, Response } from 'express'
import { z } from 'zod'
import { QuoteStatus } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../config/prisma'
import { generateQuoteNumber } from '../services/quote-number.service'
import { calculateTotals } from '../services/quote-calculations.service'
import { generateQuotePDF } from '../services/pdf.service'
import { uploadFile } from '../services/storage.service'
import { notifyManagers } from '../services/notification.service'
import { sendQuoteToClient } from '../services/email.service'
import {
  success, created, noContent, badRequest, notFound, forbidden, serverError,
} from '../utils/response'

// ─── Validation Schemas ───────────────────────────────────────────────────────

const quoteLineSchema = z.object({
  description: z.string().min(1, 'Description requise'),
  quantity: z.number().positive('Quantité doit être positive'),
  unitPrice: z.number().min(0, 'Prix unitaire invalide'),
  vatRate: z.number().min(0).max(100),
  discount: z.number().min(0).optional().nullable(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional().nullable(),
  position: z.number().int().min(0).optional(),
})

const createQuoteSchema = z.object({
  clientId: z.string().uuid('Client invalide'),
  title: z.string().min(1, 'Titre requis'),
  notes: z.string().optional().nullable(),
  termsAndConditions: z.string().optional().nullable(),
  issueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  expiryDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  discount: z.number().min(0).optional().nullable(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional().nullable(),
  lines: z.array(quoteLineSchema).min(1, 'Au moins une ligne requise'),
})

const updateQuoteSchema = createQuoteSchema.partial().omit({ lines: true }).extend({
  lines: z.array(quoteLineSchema).min(1).optional(),
})

// ─── Shared quote select ─────────────────────────────────────────────────────

const QUOTE_INCLUDE = {
  client: { select: { id: true, name: true, email: true, phone: true, address: true, city: true, postalCode: true, country: true, vatNumber: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  lines: { orderBy: { position: 'asc' as const } },
  attachments: true,
}

// ─── Controllers ─────────────────────────────────────────────────────────────

// GET /api/quotes
export async function listQuotes(req: Request, res: Response) {
  const {
    status, clientId, search,
    dateFrom, dateTo,
    page = '1', limit = '20',
  } = req.query

  const pageNum = Math.max(1, parseInt(page as string, 10))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)))
  const skip = (pageNum - 1) * limitNum

  const where: Record<string, unknown> = {}

  if (status) {
    const validStatuses = Object.values(QuoteStatus)
    if (!validStatuses.includes(status as QuoteStatus)) {
      return badRequest(res, `Statut invalide. Valeurs possibles : ${validStatuses.join(', ')}`)
    }
    where.status = status
  }

  if (clientId) where.clientId = clientId

  if (dateFrom || dateTo) {
    where.issueDate = {
      ...(dateFrom ? { gte: new Date(dateFrom as string) } : {}),
      ...(dateTo ? { lte: new Date(dateTo as string) } : {}),
    }
  }

  if (search) {
    where.OR = [
      { number: { contains: search as string, mode: 'insensitive' } },
      { title: { contains: search as string, mode: 'insensitive' } },
      { client: { name: { contains: search as string, mode: 'insensitive' } } },
    ]
  }

  const [quotes, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      include: QUOTE_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.quote.count({ where }),
  ])

  const quotesWithTotals = quotes.map((q) => ({
    ...q,
    totals: calculateTotals(q.lines, q.discount, q.discountType),
  }))

  return success(res, {
    data: quotesWithTotals,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  })
}

// POST /api/quotes
export async function createQuote(req: Request, res: Response) {
  const result = createQuoteSchema.safeParse(req.body)
  if (!result.success) {
    return badRequest(res, 'Données invalides', result.error.flatten().fieldErrors)
  }

  const { lines, ...quoteData } = result.data

  // Verify client exists
  const client = await prisma.client.findUnique({ where: { id: quoteData.clientId } })
  if (!client) return notFound(res, 'Client introuvable')

  const number = await generateQuoteNumber()

  const quote = await prisma.quote.create({
    data: {
      ...quoteData,
      number,
      createdById: req.user!.userId,
      issueDate: new Date(quoteData.issueDate),
      expiryDate: new Date(quoteData.expiryDate),
      lines: {
        create: lines.map((line, idx) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          vatRate: line.vatRate,
          discount: line.discount ?? null,
          discountType: line.discountType ?? null,
          position: line.position ?? idx,
        })),
      },
    },
    include: QUOTE_INCLUDE,
  })

  return created(res, {
    ...quote,
    totals: calculateTotals(quote.lines, quote.discount, quote.discountType),
  })
}

// GET /api/quotes/:id
export async function getQuote(req: Request, res: Response) {
  const quote = await prisma.quote.findUnique({
    where: { id: req.params.id },
    include: QUOTE_INCLUDE,
  })

  if (!quote) return notFound(res, 'Devis introuvable')

  return success(res, {
    ...quote,
    totals: calculateTotals(quote.lines, quote.discount, quote.discountType),
  })
}

// PATCH /api/quotes/:id
export async function updateQuote(req: Request, res: Response) {
  const result = updateQuoteSchema.safeParse(req.body)
  if (!result.success) {
    return badRequest(res, 'Données invalides', result.error.flatten().fieldErrors)
  }

  const existing = await prisma.quote.findUnique({ where: { id: req.params.id } })
  if (!existing) return notFound(res, 'Devis introuvable')

  // Only DRAFT quotes can be freely edited
  // SENT quotes can be updated but PDF will be regenerated (Phase 3)
  if (!['DRAFT', 'SENT'].includes(existing.status)) {
    return forbidden(res, `Impossible de modifier un devis avec le statut "${existing.status}"`)
  }

  const { lines, issueDate, expiryDate, ...rest } = result.data

  const updateData: Record<string, unknown> = { ...rest }
  if (issueDate) updateData.issueDate = new Date(issueDate)
  if (expiryDate) updateData.expiryDate = new Date(expiryDate)

  if (lines) {
    // Replace all lines atomically
    await prisma.quoteLine.deleteMany({ where: { quoteId: req.params.id } })
    updateData.lines = {
      create: lines.map((line, idx) => ({
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        vatRate: line.vatRate,
        discount: line.discount ?? null,
        discountType: line.discountType ?? null,
        position: line.position ?? idx,
      })),
    }
  }

  const quote = await prisma.quote.update({
    where: { id: req.params.id },
    data: updateData,
    include: QUOTE_INCLUDE,
  })

  return success(res, {
    ...quote,
    totals: calculateTotals(quote.lines, quote.discount, quote.discountType),
  })
}

// DELETE /api/quotes/:id — ADMIN only, DRAFT only
export async function deleteQuote(req: Request, res: Response) {
  const quote = await prisma.quote.findUnique({ where: { id: req.params.id } })
  if (!quote) return notFound(res, 'Devis introuvable')

  if (quote.status !== 'DRAFT') {
    return forbidden(res, 'Seuls les devis en brouillon peuvent être supprimés')
  }

  await prisma.quote.delete({ where: { id: req.params.id } })

  return noContent(res)
}

// POST /api/quotes/:id/send
export async function sendQuote(req: Request, res: Response) {
  const quote = await prisma.quote.findUnique({
    where: { id: req.params.id },
    include: QUOTE_INCLUDE,
  })
  if (!quote) return notFound(res, 'Devis introuvable')

  if (quote.status !== 'DRAFT') {
    return badRequest(res, `Le devis est déjà en statut "${quote.status}"`)
  }

  if (quote.lines.length === 0) {
    return badRequest(res, 'Le devis doit avoir au moins une ligne avant d\'être envoyé')
  }

  try {
    // 1. Generate a fresh signature token
    const signatureToken = uuidv4()

    // 2. Persist the token so PDF generation can embed the portal URL
    await prisma.quote.update({
      where: { id: quote.id },
      data: { signatureToken },
    })

    // 3. Determine language from the sending user's preference
    const sender = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    const lang = (sender?.preferredLang ?? 'fr') as 'fr' | 'en'

    // 4. Generate PDF buffer
    const pdfBuffer = await generateQuotePDF(quote.id, lang)

    // 5. Upload to Supabase Storage
    const storagePath = `quotes/${quote.id}/quote-${quote.number}.pdf`
    const pdfUrl = await uploadFile(pdfBuffer, storagePath, 'application/pdf')

    // 6. Update quote: status SENT + pdfUrl
    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: { status: 'SENT', pdfUrl },
      include: QUOTE_INCLUDE,
    })

    // 7. Email to client (non-fatal)
    const company = await prisma.companySettings.findUnique({ where: { id: 'singleton' } })
    await sendQuoteToClient({
      clientEmail: quote.client.email,
      clientName: quote.client.name,
      quoteNumber: quote.number,
      quoteTitle: quote.title,
      portalUrl: `${process.env.FRONTEND_URL}/client/${signatureToken}`,
      pdfBuffer,
      lang,
      companyName: company?.name ?? 'Mon Entreprise',
      expiryDate: quote.expiryDate,
    })

    // 8. FCM + DB notifications to all managers (non-fatal)
    await notifyManagers({
      type: 'QUOTE_SENT',
      quoteId: quote.id,
      quoteNumber: quote.number,
      clientName: quote.client.name,
    })

    return success(res, {
      ...updated,
      totals: calculateTotals(updated.lines, updated.discount, updated.discountType),
    })
  } catch (err) {
    console.error('Erreur envoi devis:', err)
    return serverError(res, 'Erreur lors de la génération ou de l\'envoi du devis')
  }
}

// GET /api/quotes/:id/pdf
export async function downloadPdf(req: Request, res: Response) {
  const quote = await prisma.quote.findUnique({ where: { id: req.params.id } })
  if (!quote) return notFound(res, 'Devis introuvable')

  try {
    const sender = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    const lang = (sender?.preferredLang ?? 'fr') as 'fr' | 'en'

    const pdfBuffer = await generateQuotePDF(quote.id, lang)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="devis-${quote.number}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    return res.end(pdfBuffer)
  } catch (err) {
    console.error('Erreur génération PDF:', err)
    return serverError(res, 'Erreur lors de la génération du PDF')
  }
}
