import { QuoteTotals } from '../services/quote-calculations.service'
import { DiscountType } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplateLine {
  description: string
  quantity: Decimal | number
  unitPrice: Decimal | number
  vatRate: Decimal | number
  discount?: Decimal | number | null
  discountType?: DiscountType | null
}

interface TemplateClient {
  name: string
  email: string
  phone?: string | null
  address?: string | null
  city?: string | null
  postalCode?: string | null
  country: string
  vatNumber?: string | null
}

interface TemplateCompany {
  name: string
  email: string
  phone?: string | null
  address?: string | null
  city?: string | null
  postalCode?: string | null
  country: string
  siret?: string | null
  vatNumber?: string | null
  logoUrl?: string | null
}

export interface QuoteTemplateData {
  number: string
  title: string
  issueDate: Date
  expiryDate: Date
  status: string
  notes?: string | null
  termsAndConditions?: string | null
  discount?: Decimal | number | null
  discountType?: DiscountType | null
  signatureToken?: string | null
  signedAt?: Date | null
  signedIp?: string | null
  lines: TemplateLine[]
  client: TemplateClient
  company: TemplateCompany
  totals: QuoteTotals
  portalUrl?: string
  qrCodeDataUrl?: string
  lang: 'fr' | 'en'
}

// ─── Translations ─────────────────────────────────────────────────────────────

const i18n = {
  fr: {
    quote: 'DEVIS',
    quoteNumber: 'Numéro de devis',
    issueDate: 'Date d\'émission',
    expiryDate: 'Date d\'expiration',
    billTo: 'Facturer à',
    from: 'De la part de',
    description: 'Description',
    qty: 'Qté',
    unitPrice: 'Prix unitaire',
    discount: 'Remise',
    subtotalHT: 'Sous-total HT',
    vatRate: 'TVA',
    subtotal: 'Sous-total HT',
    globalDiscount: 'Remise globale',
    totalHT: 'Total HT',
    totalTVA: 'Total TVA',
    totalTTC: 'Total TTC',
    termsAndConditions: 'Conditions générales',
    signedNote: 'Signé électroniquement le',
    fromIp: 'depuis l\'adresse IP',
    scanToView: 'Scanner pour consulter le devis',
    validUntil: 'Valable jusqu\'au',
    siret: 'SIRET',
    vatNumber: 'N° TVA',
  },
  en: {
    quote: 'QUOTE',
    quoteNumber: 'Quote number',
    issueDate: 'Issue date',
    expiryDate: 'Expiry date',
    billTo: 'Bill to',
    from: 'From',
    description: 'Description',
    qty: 'Qty',
    unitPrice: 'Unit price',
    discount: 'Discount',
    subtotalHT: 'Subtotal (excl. VAT)',
    vatRate: 'VAT',
    subtotal: 'Subtotal (excl. VAT)',
    globalDiscount: 'Global discount',
    totalHT: 'Total (excl. VAT)',
    totalTVA: 'Total VAT',
    totalTTC: 'Total (incl. VAT)',
    termsAndConditions: 'Terms & Conditions',
    signedNote: 'Electronically signed on',
    fromIp: 'from IP address',
    scanToView: 'Scan to view the quote',
    validUntil: 'Valid until',
    siret: 'SIRET',
    vatNumber: 'VAT number',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNum(val: Decimal | number | null | undefined): number {
  if (val === null || val === undefined) return 0
  return typeof val === 'number' ? val : parseFloat(val.toString())
}

function formatCurrency(val: number, currency = 'EUR', locale = 'fr-FR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(val)
}

function formatDate(date: Date, lang: 'fr' | 'en'): string {
  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

function applyLineDiscount(gross: number, discount?: Decimal | number | null, type?: DiscountType | null): number {
  if (!discount || !type) return gross
  const d = toNum(discount)
  return type === 'PERCENTAGE' ? gross * (1 - d / 100) : Math.max(0, gross - d)
}

function discountLabel(val: Decimal | number | null | undefined, type: DiscountType | null | undefined): string {
  if (!val || !type) return '—'
  const n = toNum(val)
  return type === 'PERCENTAGE' ? `${n}%` : formatCurrency(n)
}

// ─── Status badge color ───────────────────────────────────────────────────────

function statusColor(status: string): string {
  const map: Record<string, string> = {
    DRAFT: '#94a3b8',
    SENT: '#3b82f6',
    ACCEPTED: '#22c55e',
    REFUSED: '#ef4444',
    EXPIRED: '#f97316',
  }
  return map[status] ?? '#94a3b8'
}

// ─── Main template function ───────────────────────────────────────────────────

export function buildQuoteHtml(data: QuoteTemplateData): string {
  const t = i18n[data.lang]
  const locale = data.lang === 'fr' ? 'fr-FR' : 'en-GB'
  const currency = 'EUR'

  const linesHtml = data.lines.map((line) => {
    const gross = toNum(line.quantity) * toNum(line.unitPrice)
    const lineHT = applyLineDiscount(gross, line.discount, line.discountType)
    const vatAmt = lineHT * (toNum(line.vatRate) / 100)

    return `
      <tr>
        <td class="td-desc">${escapeHtml(line.description)}</td>
        <td class="td-center">${toNum(line.quantity).toLocaleString(locale)}</td>
        <td class="td-right">${formatCurrency(toNum(line.unitPrice), currency, locale)}</td>
        <td class="td-center">${discountLabel(line.discount, line.discountType)}</td>
        <td class="td-right">${formatCurrency(lineHT, currency, locale)}</td>
        <td class="td-center">${toNum(line.vatRate)}%</td>
        <td class="td-right">${formatCurrency(vatAmt, currency, locale)}</td>
      </tr>`
  }).join('')

  const vatRowsHtml = Object.entries(data.totals.vatByRate)
    .filter(([, v]) => v > 0)
    .map(([rate, amount]) => `
      <tr>
        <td>${t.vatRate} ${rate}%</td>
        <td class="td-right">${formatCurrency(amount, currency, locale)}</td>
      </tr>`
    ).join('')

  const globalDiscountRow = data.totals.globalDiscountAmount > 0 ? `
    <tr>
      <td>${t.globalDiscount} (${discountLabel(data.discount, data.discountType)})</td>
      <td class="td-right totals-discount">−${formatCurrency(data.totals.globalDiscountAmount, currency, locale)}</td>
    </tr>` : ''

  const signatureBlock = data.signedAt ? `
    <div class="signature-block">
      <div class="signature-icon">✅</div>
      <div>
        <strong>${t.signedNote} ${formatDate(data.signedAt, data.lang)}</strong>
        ${data.signedIp ? `<br><span class="signature-ip">${t.fromIp} ${data.signedIp}</span>` : ''}
      </div>
    </div>` : ''

  const qrBlock = data.qrCodeDataUrl && !data.signedAt ? `
    <div class="qr-section">
      <img src="${data.qrCodeDataUrl}" alt="QR Code" width="100" height="100" />
      <p class="qr-label">${t.scanToView}</p>
    </div>` : ''

  const termsBlock = data.termsAndConditions ? `
    <div class="terms">
      <h4>${t.termsAndConditions}</h4>
      <p>${escapeHtml(data.termsAndConditions).replace(/\n/g, '<br>')}</p>
    </div>` : ''

  const companyAddress = [
    data.company.address,
    [data.company.postalCode, data.company.city].filter(Boolean).join(' '),
    data.company.country,
  ].filter(Boolean).join('<br>')

  const clientAddress = [
    data.client.address,
    [data.client.postalCode, data.client.city].filter(Boolean).join(' '),
    data.client.country,
  ].filter(Boolean).join('<br>')

  return `<!DOCTYPE html>
<html lang="${data.lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t.quote} ${data.number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 13px;
      color: #1e293b;
      line-height: 1.5;
      background: #fff;
      padding: 40px;
    }
    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 3px solid #2563eb;
    }
    .company-logo img { max-height: 60px; max-width: 200px; }
    .company-logo .company-name { font-size: 22px; font-weight: 700; color: #2563eb; }
    .company-meta { font-size: 11px; color: #64748b; margin-top: 4px; }
    .quote-title-block { text-align: right; }
    .quote-title-block h1 {
      font-size: 28px; font-weight: 800; color: #2563eb; letter-spacing: 2px;
    }
    .quote-number { font-size: 16px; font-weight: 600; color: #1e293b; margin-top: 4px; }
    .status-badge {
      display: inline-block;
      padding: 3px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      color: #fff;
      margin-top: 6px;
      background: ${statusColor(data.status)};
    }
    /* ── Addresses ── */
    .addresses {
      display: flex;
      gap: 40px;
      margin-bottom: 32px;
    }
    .address-block { flex: 1; }
    .address-block h3 {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    .address-block .name { font-size: 15px; font-weight: 700; color: #1e293b; }
    .address-block .detail { color: #475569; font-size: 12px; margin-top: 2px; }
    /* ── Meta info ── */
    .meta-grid {
      display: flex;
      gap: 16px;
      margin-bottom: 32px;
    }
    .meta-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 16px;
      flex: 1;
    }
    .meta-item label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      display: block;
    }
    .meta-item span { font-size: 14px; font-weight: 600; color: #1e293b; }
    /* ── Lines table ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    thead tr { background: #2563eb; color: #fff; }
    thead th {
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody tr:hover { background: #eff6ff; }
    tbody td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    .td-desc { max-width: 220px; }
    .td-center { text-align: center; }
    .td-right { text-align: right; }
    /* ── Totals ── */
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 32px;
    }
    .totals-table {
      width: 300px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .totals-table table { margin: 0; }
    .totals-table tbody tr:nth-child(even) { background: #f8fafc; }
    .totals-table tbody td { padding: 8px 16px; font-size: 13px; }
    .totals-discount { color: #ef4444; }
    .totals-table .total-ttc-row {
      background: #2563eb !important;
      color: #fff;
    }
    .totals-table .total-ttc-row td {
      font-size: 15px;
      font-weight: 800;
      padding: 12px 16px;
    }
    /* ── Signature ── */
    .signature-block {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .signature-icon { font-size: 24px; }
    .signature-ip { font-size: 11px; color: #64748b; }
    /* ── QR code ── */
    .qr-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      float: right;
      margin-left: 24px;
    }
    .qr-label { font-size: 10px; color: #94a3b8; text-align: center; }
    /* ── Terms ── */
    .terms {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
    }
    .terms h4 {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    .terms p { font-size: 11px; color: #64748b; line-height: 1.6; }
    /* ── Footer ── */
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="company-logo">
      ${data.company.logoUrl
        ? `<img src="${data.company.logoUrl}" alt="${escapeHtml(data.company.name)}" />`
        : `<div class="company-name">${escapeHtml(data.company.name)}</div>`}
      <div class="company-meta">
        ${data.company.email ? `${escapeHtml(data.company.email)}<br>` : ''}
        ${data.company.phone ? `${escapeHtml(data.company.phone)}<br>` : ''}
        ${companyAddress}
        ${data.company.siret ? `<br>${t.siret} : ${data.company.siret}` : ''}
        ${data.company.vatNumber ? `<br>${t.vatNumber} : ${data.company.vatNumber}` : ''}
      </div>
    </div>
    <div class="quote-title-block">
      <h1>${t.quote}</h1>
      <div class="quote-number">${data.number}</div>
      <div class="status-badge">${data.status}</div>
    </div>
  </div>

  <!-- ADDRESSES -->
  <div class="addresses">
    <div class="address-block">
      <h3>${t.billTo}</h3>
      <div class="name">${escapeHtml(data.client.name)}</div>
      <div class="detail">${escapeHtml(data.client.email)}</div>
      ${data.client.phone ? `<div class="detail">${escapeHtml(data.client.phone)}</div>` : ''}
      ${clientAddress ? `<div class="detail">${clientAddress}</div>` : ''}
      ${data.client.vatNumber ? `<div class="detail">${t.vatNumber} : ${data.client.vatNumber}</div>` : ''}
    </div>
  </div>

  <!-- META INFO -->
  <div class="meta-grid">
    <div class="meta-item">
      <label>${t.quoteNumber}</label>
      <span>${data.number}</span>
    </div>
    <div class="meta-item">
      <label>${t.issueDate}</label>
      <span>${formatDate(data.issueDate, data.lang)}</span>
    </div>
    <div class="meta-item">
      <label>${t.validUntil}</label>
      <span>${formatDate(data.expiryDate, data.lang)}</span>
    </div>
  </div>

  <!-- QR CODE (only if not yet signed) -->
  ${qrBlock}

  <!-- SIGNATURE BLOCK (if signed) -->
  ${signatureBlock}

  <!-- LINES TABLE -->
  <table>
    <thead>
      <tr>
        <th>${t.description}</th>
        <th>${t.qty}</th>
        <th>${t.unitPrice}</th>
        <th>${t.discount}</th>
        <th>${t.subtotalHT}</th>
        <th>${t.vatRate}</th>
        <th>TVA €</th>
      </tr>
    </thead>
    <tbody>
      ${linesHtml}
    </tbody>
  </table>

  <!-- TOTALS -->
  <div class="totals-section">
    <div class="totals-table">
      <table>
        <tbody>
          <tr>
            <td>${t.subtotal}</td>
            <td class="td-right">${formatCurrency(data.totals.subtotalHT, currency, locale)}</td>
          </tr>
          ${globalDiscountRow}
          <tr>
            <td>${t.totalHT}</td>
            <td class="td-right">${formatCurrency(data.totals.totalHT, currency, locale)}</td>
          </tr>
          ${vatRowsHtml}
          <tr class="total-ttc-row">
            <td>${t.totalTTC}</td>
            <td class="td-right">${formatCurrency(data.totals.totalTTC, currency, locale)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- TERMS -->
  ${termsBlock}

  <!-- FOOTER -->
  <div class="footer">
    ${data.company.name} — ${data.number} — ${t.validUntil} ${formatDate(data.expiryDate, data.lang)}
  </div>

</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
