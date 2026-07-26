import { Request, Response } from 'express'
import ExcelJS from 'exceljs'
import puppeteer from 'puppeteer'
import { prisma } from '../config/prisma'
import { calculateTotals } from '../services/quote-calculations.service'
import { serverError } from '../utils/response'
import { QuoteStatus } from '@prisma/client'

// ─── Shared query builder ─────────────────────────────────────────────────────

function buildWhereClause(query: Record<string, string | undefined>) {
  const { status, clientId, dateFrom, dateTo } = query
  return {
    ...(status && { status: status as QuoteStatus }),
    ...(clientId && { clientId }),
    ...(dateFrom || dateTo
      ? {
          issueDate: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo + 'T23:59:59.999Z') }),
          },
        }
      : {}),
  }
}

function statusLabel(status: QuoteStatus): string {
  const labels: Record<QuoteStatus, string> = {
    DRAFT: 'Brouillon',
    SENT: 'Envoyé',
    ACCEPTED: 'Accepté',
    REFUSED: 'Refusé',
    EXPIRED: 'Expiré',
  }
  return labels[status] ?? status
}

function formatDateFR(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatCurrencyFR(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

// ─── Excel export ─────────────────────────────────────────────────────────────

export async function exportExcel(req: Request, res: Response): Promise<void> {
  try {
    const where = buildWhereClause(req.query as Record<string, string>)

    const quotes = await prisma.quote.findMany({
      where,
      orderBy: { issueDate: 'desc' },
      include: {
        client: { select: { name: true } },
        lines: true,
      },
    })

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Plateforme Devis'
    workbook.created = new Date()

    const sheet = workbook.addWorksheet('Devis', {
      pageSetup: { fitToPage: true, fitToWidth: 1 },
    })

    // ── Header row ──
    const HEADER_FILL: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    }
    const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    const BORDER: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    }

    const columns = [
      { header: 'Numéro', key: 'number', width: 16 },
      { header: 'Client', key: 'client', width: 28 },
      { header: 'Titre', key: 'title', width: 36 },
      { header: 'Statut', key: 'status', width: 14 },
      { header: 'Date émission', key: 'issueDate', width: 16 },
      { header: 'Date expiration', key: 'expiryDate', width: 16 },
      { header: 'Total HT', key: 'totalHT', width: 16 },
      { header: 'Total TVA', key: 'totalTVA', width: 16 },
      { header: 'Total TTC', key: 'totalTTC', width: 16 },
      { header: 'Signé le', key: 'signedAt', width: 16 },
    ]

    sheet.columns = columns

    // Style header row
    const headerRow = sheet.getRow(1)
    headerRow.eachCell((cell) => {
      cell.fill = HEADER_FILL
      cell.font = HEADER_FONT
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = BORDER
    })
    headerRow.height = 28

    // ── Data rows ──
    quotes.forEach((q, idx) => {
      const totals = calculateTotals(q.lines, q.discount, q.discountType)
      const row = sheet.addRow({
        number: q.number,
        client: q.client.name,
        title: q.title,
        status: statusLabel(q.status),
        issueDate: formatDateFR(new Date(q.issueDate)),
        expiryDate: formatDateFR(new Date(q.expiryDate)),
        totalHT: totals.totalHT,
        totalTVA: totals.totalTVA,
        totalTTC: totals.totalTTC,
        signedAt: q.signedAt ? formatDateFR(new Date(q.signedAt)) : '',
      })

      // Alternating row color
      const bgColor = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFF'
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
        cell.border = BORDER
        cell.alignment = { vertical: 'middle' }
      })

      // Format currency cells
      ;(['totalHT', 'totalTVA', 'totalTTC'] as const).forEach((key) => {
        const colIdx = columns.findIndex((c) => c.key === key) + 1
        const cell = row.getCell(colIdx)
        cell.numFmt = '#,##0.00 [$€-fr-FR]'
        cell.alignment = { horizontal: 'right', vertical: 'middle' }
      })

      // Color status cell
      const statusColIdx = columns.findIndex((c) => c.key === 'status') + 1
      const statusCell = row.getCell(statusColIdx)
      const statusColors: Record<string, string> = {
        ACCEPTED: 'FF16A34A',
        REFUSED: 'FFDC2626',
        SENT: 'FF2563EB',
        EXPIRED: 'FFEA580C',
        DRAFT: 'FF6B7280',
      }
      statusCell.font = {
        bold: true,
        color: { argb: statusColors[q.status] ?? 'FF374151' },
      }
      statusCell.alignment = { horizontal: 'center', vertical: 'middle' }

      row.height = 22
    })

    // ── Summary row ──
    const totalRow = sheet.addRow({
      number: `${quotes.length} devis`,
      totalHT: quotes.reduce((s, q) => s + calculateTotals(q.lines, q.discount, q.discountType).totalHT, 0),
      totalTVA: quotes.reduce((s, q) => s + calculateTotals(q.lines, q.discount, q.discountType).totalTVA, 0),
      totalTTC: quotes.reduce((s, q) => s + calculateTotals(q.lines, q.discount, q.discountType).totalTTC, 0),
    })
    totalRow.eachCell((cell) => {
      cell.font = { bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } }
      cell.border = BORDER
    })
    ;(['totalHT', 'totalTVA', 'totalTTC'] as const).forEach((key) => {
      const colIdx = columns.findIndex((c) => c.key === key) + 1
      totalRow.getCell(colIdx).numFmt = '#,##0.00 [$€-fr-FR]'
    })

    // Freeze header row
    sheet.views = [{ state: 'frozen', ySplit: 1 }]

    const filename = `devis-export-${new Date().toISOString().slice(0, 10)}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    await workbook.xlsx.write(res)
    res.end()
  } catch (err) {
    serverError(res, err)
  }
}

// ─── PDF list export ──────────────────────────────────────────────────────────

export async function exportPdfList(req: Request, res: Response): Promise<void> {
  try {
    const where = buildWhereClause(req.query as Record<string, string>)

    const quotes = await prisma.quote.findMany({
      where,
      orderBy: { issueDate: 'desc' },
      include: {
        client: { select: { name: true } },
        lines: true,
      },
    })

    const STATUS_COLORS: Record<QuoteStatus, string> = {
      DRAFT:    '#6B7280',
      SENT:     '#2563EB',
      ACCEPTED: '#16A34A',
      REFUSED:  '#DC2626',
      EXPIRED:  '#EA580C',
    }

    const rows = quotes.map((q) => {
      const totals = calculateTotals(q.lines, q.discount, q.discountType)
      const color = STATUS_COLORS[q.status]
      return `
        <tr>
          <td class="mono">${q.number}</td>
          <td>${q.client.name}</td>
          <td>${q.title}</td>
          <td><span class="badge" style="color:${color};border-color:${color}">${statusLabel(q.status)}</span></td>
          <td>${formatDateFR(new Date(q.issueDate))}</td>
          <td>${formatDateFR(new Date(q.expiryDate))}</td>
          <td class="num">${formatCurrencyFR(totals.totalHT)}</td>
          <td class="num">${formatCurrencyFR(totals.totalTTC)}</td>
        </tr>`
    }).join('')

    const grandTotalHT = quotes.reduce((s, q) => s + calculateTotals(q.lines, q.discount, q.discountType).totalHT, 0)
    const grandTotalTTC = quotes.reduce((s, q) => s + calculateTotals(q.lines, q.discount, q.discountType).totalTTC, 0)

    const filterDesc = [
      req.query.status ? `Statut : ${statusLabel(req.query.status as QuoteStatus)}` : '',
      req.query.dateFrom ? `Du ${req.query.dateFrom}` : '',
      req.query.dateTo ? `au ${req.query.dateTo}` : '',
    ].filter(Boolean).join(' | ') || 'Tous les devis'

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, sans-serif; font-size: 11px; color: #111827; padding: 32px; }
  h1 { font-size: 20px; font-weight: 700; color: #1E40AF; margin-bottom: 4px; }
  .meta { font-size: 10px; color: #6B7280; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #1E40AF; color: #fff; }
  thead th { padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; }
  tbody tr:nth-child(even) { background: #F8FAFF; }
  tbody td { padding: 7px 10px; border-bottom: 1px solid #E5E7EB; }
  tfoot td { padding: 8px 10px; font-weight: 700; background: #EFF6FF; border-top: 2px solid #BFDBFE; }
  .mono { font-family: 'Courier New', monospace; font-weight: 600; }
  .num { text-align: right; }
  .badge { font-size: 10px; font-weight: 600; border: 1px solid; border-radius: 12px; padding: 1px 7px; }
  .footer { margin-top: 24px; font-size: 9px; color: #9CA3AF; text-align: right; }
</style>
</head>
<body>
  <h1>Liste des devis</h1>
  <p class="meta">Généré le ${formatDateFR(new Date())} · ${filterDesc} · ${quotes.length} devis</p>
  <table>
    <thead>
      <tr>
        <th>Numéro</th>
        <th>Client</th>
        <th>Titre</th>
        <th>Statut</th>
        <th>Émission</th>
        <th>Expiration</th>
        <th class="num">Total HT</th>
        <th class="num">Total TTC</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="6">${quotes.length} devis</td>
        <td class="num">${formatCurrencyFR(grandTotalHT)}</td>
        <td class="num">${formatCurrencyFR(grandTotalTTC)}</td>
      </tr>
    </tfoot>
  </table>
  <p class="footer">Plateforme Devis · Export PDF automatique</p>
</body>
</html>`

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true,
    })
    await browser.close()

    const filename = `devis-liste-${new Date().toISOString().slice(0, 10)}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(Buffer.from(pdfBuffer))
  } catch (err) {
    serverError(res, err)
  }
}
