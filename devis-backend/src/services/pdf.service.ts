import puppeteer from 'puppeteer'
import QRCode from 'qrcode'
import { prisma } from '../config/prisma'
import { calculateTotals } from './quote-calculations.service'
import { buildQuoteHtml, QuoteTemplateData } from '../templates/quote-template'
import { env } from '../config/env'

/**
 * Generate a PDF buffer for a given quote ID.
 * Fetches all required data from DB, builds the HTML template,
 * and renders it with Puppeteer.
 */
export async function generateQuotePDF(
  quoteId: string,
  lang: 'fr' | 'en' = 'fr'
): Promise<Buffer> {
  // Fetch quote with all relations
  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id: quoteId },
    include: {
      lines: { orderBy: { position: 'asc' } },
      client: true,
    },
  })

  // Fetch company settings
  const company = await prisma.companySettings.findUnique({ where: { id: 'singleton' } })

  // Build portal URL + QR code (only if not yet signed)
  let qrCodeDataUrl: string | undefined
  let portalUrl: string | undefined

  if (quote.signatureToken && !quote.signedAt) {
    portalUrl = `${env.FRONTEND_URL}/client/${quote.signatureToken}`
    try {
      qrCodeDataUrl = await QRCode.toDataURL(portalUrl, { width: 120, margin: 1 })
    } catch {
      // QR code failure is non-fatal
      console.warn('QR code generation failed for quote', quoteId)
    }
  }

  const totals = calculateTotals(quote.lines, quote.discount, quote.discountType)

  const templateData: QuoteTemplateData = {
    number: quote.number,
    title: quote.title,
    issueDate: quote.issueDate,
    expiryDate: quote.expiryDate,
    status: quote.status,
    notes: quote.notes,
    termsAndConditions: quote.termsAndConditions,
    discount: quote.discount,
    discountType: quote.discountType,
    signatureToken: quote.signatureToken,
    signedAt: quote.signedAt,
    signedIp: quote.signedIp,
    lines: quote.lines,
    client: {
      name: quote.client.name,
      email: quote.client.email,
      phone: quote.client.phone,
      address: quote.client.address,
      city: quote.client.city,
      postalCode: quote.client.postalCode,
      country: quote.client.country,
      vatNumber: quote.client.vatNumber,
    },
    company: {
      name: company?.name ?? 'Mon Entreprise',
      email: company?.email ?? '',
      phone: company?.phone,
      address: company?.address,
      city: company?.city,
      postalCode: company?.postalCode,
      country: company?.country ?? 'FR',
      siret: company?.siret,
      vatNumber: company?.vatNumber,
      logoUrl: company?.logoUrl,
    },
    totals,
    portalUrl,
    qrCodeDataUrl,
    lang,
  }

  const html = buildQuoteHtml(templateData)

  return renderHtmlToPdf(html)
}

/**
 * Render an HTML string to PDF using Puppeteer.
 * Returns the PDF as a Buffer.
 */
async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  })

  try {
    const page = await browser.newPage()

    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
