import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/prisma'
import { calculateTotals } from '../services/quote-calculations.service'
import { generateQuotePDF } from '../services/pdf.service'
import { uploadFile } from '../services/storage.service'
import { notifyManagers } from '../services/notification.service'
import { sendSignatureConfirmation } from '../services/email.service'
import { success, badRequest, serverError } from '../utils/response'

const signSchema = z.object({
  decision: z.enum(['ACCEPTED', 'REFUSED'], {
    errorMap: () => ({ message: 'Décision invalide : ACCEPTED ou REFUSED requis' }),
  }),
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  return req.socket.remoteAddress ?? 'unknown'
}

// Strip internal-only fields before sending to client portal
function sanitizeQuoteForPortal(quote: NonNullable<Request['portalQuote']>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { notes, signatureToken, signedIp, signedUserAgent, createdById, ...safe } = quote as Record<string, unknown>
  return safe
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/client/:token
 * Public endpoint — returns quote data safe for client view.
 */
export async function getPortalQuote(req: Request, res: Response) {
  const quote = req.portalQuote!

  const totals = calculateTotals(quote.lines, quote.discount, quote.discountType)

  const companySettings = await prisma.companySettings.findUnique({ where: { id: 'singleton' } })

  return success(res, {
    ...sanitizeQuoteForPortal(quote),
    totals,
    company: {
      name: companySettings?.name ?? 'Mon Entreprise',
      address: companySettings?.address ?? null,
      phone: companySettings?.phone ?? null,
      email: companySettings?.email ?? null,
      logoUrl: companySettings?.logoUrl ?? null,
    },
  })
}

/**
 * POST /api/client/:token/sign
 * Public endpoint — client accepts or refuses the quote.
 */
export async function signQuote(req: Request, res: Response) {
  const quote = req.portalQuote!

  // Only SENT quotes can be signed
  if (quote.status !== 'SENT') {
    return badRequest(
      res,
      quote.status === 'ACCEPTED' || quote.status === 'REFUSED'
        ? 'Ce devis a déjà été signé.'
        : `Ce devis ne peut pas être signé (statut : ${quote.status})`
    )
  }

  const result = signSchema.safeParse(req.body)
  if (!result.success) {
    return badRequest(res, 'Données invalides', result.error.flatten().fieldErrors)
  }

  const { decision } = result.data
  const signedAt = new Date()
  const signedIp = getClientIp(req)
  const signedUserAgent = req.headers['user-agent'] ?? 'unknown'

  try {
    // 1. Update quote status + signature metadata
    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: decision,
        signedAt,
        signedIp,
        signedUserAgent,
      },
    })

    // 2. Regenerate PDF with signature mention
    const lang = 'fr' // Portal defaults to French; Phase 8 will detect client's browser lang
    const pdfBuffer = await generateQuotePDF(quote.id, lang)

    // 3. Re-upload signed PDF to Supabase (overwrites previous)
    const storagePath = `quotes/${quote.id}/quote-${quote.number}.pdf`
    const pdfUrl = await uploadFile(pdfBuffer, storagePath, 'application/pdf')

    // 4. Update pdfUrl in DB
    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: { pdfUrl },
      include: {
        lines: { orderBy: { position: 'asc' } },
        client: true,
        attachments: true,
      },
    })

    // 5. FCM + DB notifications to all managers (non-fatal)
    await notifyManagers({
      type: decision === 'ACCEPTED' ? 'QUOTE_ACCEPTED' : 'QUOTE_REFUSED',
      quoteId: quote.id,
      quoteNumber: quote.number,
      clientName: quote.client.name,
    })

    // 6. Email confirmation to client (non-fatal)
    const company = await prisma.companySettings.findUnique({ where: { id: 'singleton' } })
    await sendSignatureConfirmation({
      clientEmail: quote.client.email,
      clientName: quote.client.name,
      quoteNumber: quote.number,
      quoteTitle: quote.title,
      decision,
      lang,
      companyName: company?.name ?? 'Mon Entreprise',
    })

    const totals = calculateTotals(updated.lines, updated.discount, updated.discountType)

    return success(res, {
      decision,
      signedAt,
      message: decision === 'ACCEPTED'
        ? 'Devis accepté avec succès. Vous allez recevoir une confirmation par email.'
        : 'Devis refusé. Merci de nous avoir informés.',
      totals,
    })
  } catch (err) {
    console.error('Erreur signature devis:', err)
    return serverError(res, 'Erreur lors du traitement de votre décision')
  }
}
