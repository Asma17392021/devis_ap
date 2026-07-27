import { Resend } from 'resend'
import { env } from '../config/env'

let resend: Resend | null = null

function getResend(): Resend {
  if (!resend) {
    if (!env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY non configuré')
    }
    resend = new Resend(env.RESEND_API_KEY)
  }
  return resend
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SendQuoteParams {
  clientEmail: string
  clientName: string
  quoteNumber: string
  quoteTitle: string
  portalUrl: string
  pdfBuffer: Buffer
  lang: 'fr' | 'en'
  companyName: string
  expiryDate: Date
}

export interface SendSignatureConfirmationParams {
  clientEmail: string
  clientName: string
  quoteNumber: string
  quoteTitle: string
  decision: 'ACCEPTED' | 'REFUSED'
  lang: 'fr' | 'en'
  companyName: string
}

// ─── Translations ─────────────────────────────────────────────────────────────

const t = {
  fr: {
    sendSubject: (n: string) => `Votre devis ${n}`,
    sendHeading: (name: string) => `Bonjour ${name},`,
    sendBody: (company: string, n: string) => `${company} vous a envoyé un devis (${n}).`,
    sendCta: 'Consulter et signer le devis',
    sendAttachment: 'Le devis est également joint en pièce jointe (PDF).',
    sendExpiry: (d: string) => `Ce devis est valable jusqu\'au ${d}.`,
    acceptedSubject: (n: string) => `Confirmation d\'acceptation — Devis ${n}`,
    refusedSubject: (n: string) => `Confirmation de refus — Devis ${n}`,
    acceptedHeading: (name: string) => `Bonjour ${name},`,
    acceptedBody: (n: string) => `Nous confirmons bien la réception de votre acceptation du devis ${n}.`,
    refusedBody: (n: string) => `Nous confirmons bien la réception de votre refus du devis ${n}.`,
    acceptedThank: 'Merci pour votre confiance. Nous allons vous contacter prochainement.',
    refusedThank: 'Merci de nous avoir informés. N\'hésitez pas à nous contacter si vous avez des questions.',
    regards: 'Cordialement,',
  },
  en: {
    sendSubject: (n: string) => `Your quote ${n}`,
    sendHeading: (name: string) => `Hello ${name},`,
    sendBody: (company: string, n: string) => `${company} has sent you a quote (${n}).`,
    sendCta: 'View and sign the quote',
    sendAttachment: 'The quote is also attached as a PDF.',
    sendExpiry: (d: string) => `This quote is valid until ${d}.`,
    acceptedSubject: (n: string) => `Acceptance confirmation — Quote ${n}`,
    refusedSubject: (n: string) => `Refusal confirmation — Quote ${n}`,
    acceptedHeading: (name: string) => `Hello ${name},`,
    acceptedBody: (n: string) => `We confirm receipt of your acceptance of quote ${n}.`,
    refusedBody: (n: string) => `We confirm receipt of your refusal of quote ${n}.`,
    acceptedThank: 'Thank you for your trust. We will contact you shortly.',
    refusedThank: 'Thank you for letting us know. Feel free to contact us if you have any questions.',
    regards: 'Best regards,',
  },
}

function formatDate(date: Date, lang: 'fr' | 'en'): string {
  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  }).format(new Date(date))
}

// ─── Base HTML wrapper ────────────────────────────────────────────────────────

function wrapEmail(content: string, companyName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #2563eb; padding: 28px 32px; }
    .header h1 { color: #fff; font-size: 20px; margin: 0; }
    .body { padding: 32px; color: #1e293b; font-size: 15px; line-height: 1.7; }
    .cta { display: inline-block; margin: 24px 0; background: #2563eb; color: #fff !important; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 700; font-size: 15px; }
    .note { color: #64748b; font-size: 13px; margin-top: 16px; }
    .footer { background: #f8fafc; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    .badge-accepted { display: inline-block; background: #dcfce7; color: #16a34a; padding: 4px 12px; border-radius: 999px; font-weight: 700; font-size: 13px; }
    .badge-refused { display: inline-block; background: #fee2e2; color: #dc2626; padding: 4px 12px; border-radius: 999px; font-weight: 700; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${companyName}</h1>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      ${companyName} — Ce message a été généré automatiquement
    </div>
  </div>
</body>
</html>`
}

// ─── Email senders ────────────────────────────────────────────────────────────

/**
 * Send the quote to the client with a portal link and PDF attachment.
 * Gracefully degrades if Resend is not configured.
 */
export async function sendQuoteToClient(params: SendQuoteParams): Promise<void> {
  const { clientEmail, clientName, quoteNumber, quoteTitle, portalUrl, pdfBuffer, lang, companyName, expiryDate } = params
  const tr = t[lang]

  const content = `
    <p>${tr.sendHeading(clientName)}</p>
    <p>${tr.sendBody(companyName, quoteNumber)}</p>
    <p><strong>${quoteTitle}</strong></p>
    <p>${tr.sendExpiry(formatDate(expiryDate, lang))}</p>
    <a href="${portalUrl}" class="cta">${tr.sendCta}</a>
    <p class="note">${tr.sendAttachment}</p>
    <p>${tr.regards}<br/><strong>${companyName}</strong></p>
  `

  try {
    const client = getResend()
    const { error } = await client.emails.send({
      from: `${companyName} <noreply@${getDomain()}>`,
      to: clientEmail,
      subject: tr.sendSubject(quoteNumber),
      html: wrapEmail(content, companyName),
      attachments: [
        {
          filename: `devis-${quoteNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    })
    if (error) throw error
    console.log(`📧 Email envoyé à ${clientEmail} (devis ${quoteNumber})`)
  } catch (err) {
    console.error(`⚠️ Email envoi échoué pour ${clientEmail}:`, err)
  }
}

/**
 * Send a signature confirmation email to the client after they accept or refuse.
 */
export async function sendSignatureConfirmation(params: SendSignatureConfirmationParams): Promise<void> {
  const { clientEmail, clientName, quoteNumber, decision, lang, companyName } = params
  const tr = t[lang]

  const isAccepted = decision === 'ACCEPTED'
  const subject = isAccepted ? tr.acceptedSubject(quoteNumber) : tr.refusedSubject(quoteNumber)
  const bodyText = isAccepted ? tr.acceptedBody(quoteNumber) : tr.refusedBody(quoteNumber)
  const thankText = isAccepted ? tr.acceptedThank : tr.refusedThank
  const badge = isAccepted
    ? `<span class="badge-accepted">✅ Accepté</span>`
    : `<span class="badge-refused">❌ Refusé</span>`

  const content = `
    <p>${tr.acceptedHeading(clientName)}</p>
    <p>${badge}</p>
    <p>${bodyText}</p>
    <p>${thankText}</p>
    <p>${tr.regards}<br/><strong>${companyName}</strong></p>
  `

  try {
    const client = getResend()
    const { error } = await client.emails.send({
      from: `${companyName} <noreply@${getDomain()}>`,
      to: clientEmail,
      subject,
      html: wrapEmail(content, companyName),
    })
    if (error) throw error
    console.log(`📧 Confirmation ${decision} envoyée à ${clientEmail}`)
  } catch (err) {
    console.error(`⚠️ Email confirmation échoué pour ${clientEmail}:`, err)
  }
}

/**
 * Notify client that their quote request was rejected (with optional reason).
 */
export async function sendRequestRejection(params: {
  clientEmail: string
  clientName: string
  requestTitle: string
  rejectionReason?: string
  handledByName?: string
  companyName: string
  portalUrl: string
}): Promise<void> {
  const { clientEmail, clientName, requestTitle, rejectionReason, handledByName, companyName, portalUrl } = params

  const content = `
    <p>Bonjour ${clientName},</p>
    <p>Nous avons examiné votre demande de devis :</p>
    <p><strong>${requestTitle}</strong></p>
    <p><span class="badge-refused">❌ Demande refusée</span></p>
    ${rejectionReason ? `
    <div style="background:#fff7f7;border-left:4px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:4px;">
      <p style="margin:0;color:#7f1d1d;font-size:14px;"><strong>Motif :</strong> ${rejectionReason}</p>
    </div>` : ''}
    ${handledByName ? `<p style="color:#6b7280;font-size:13px;">Traité par ${handledByName}</p>` : ''}
    <p>N'hésitez pas à nous contacter ou à soumettre une nouvelle demande depuis votre espace client.</p>
    <a href="${portalUrl}" class="cta">Accéder à mon espace</a>
    <p>Cordialement,<br/><strong>${companyName}</strong></p>
  `

  try {
    const client = getResend()
    const { error } = await client.emails.send({
      from: `${companyName} <noreply@${getDomain()}>`,
      to: clientEmail,
      subject: `Votre demande de devis — ${requestTitle}`,
      html: wrapEmail(content, companyName),
    })
    if (error) throw error
    console.log(`📧 Email refus demande envoyé à ${clientEmail}`)
  } catch (err) {
    console.error(`⚠️ Email refus demande échoué pour ${clientEmail}:`, err)
  }
}

/**
 * Notify client that their quote request status was updated.
 */
export async function sendRequestStatusUpdate(params: {
  clientEmail: string
  clientName: string
  requestTitle: string
  newStatus: string
  handledByName?: string
  companyName: string
  portalUrl: string
}): Promise<void> {
  const { clientEmail, clientName, requestTitle, newStatus, handledByName, companyName, portalUrl } = params

  const statusLabels: Record<string, string> = {
    IN_PROGRESS: '🔄 En cours de traitement',
    COMPLETED: '✅ Traité — un devis va vous être envoyé',
  }

  const label = statusLabels[newStatus]
  if (!label) return // Don't send for other statuses

  const content = `
    <p>Bonjour ${clientName},</p>
    <p>Le statut de votre demande de devis a été mis à jour :</p>
    <p><strong>${requestTitle}</strong></p>
    <p><span style="background:#dbeafe;color:#1d4ed8;padding:4px 12px;border-radius:999px;font-weight:700;font-size:13px;">${label}</span></p>
    ${handledByName ? `<p style="color:#6b7280;font-size:13px;">Traité par ${handledByName}</p>` : ''}
    <a href="${portalUrl}" class="cta">Voir mes demandes</a>
    <p>Cordialement,<br/><strong>${companyName}</strong></p>
  `

  try {
    const client = getResend()
    const { error } = await client.emails.send({
      from: `${companyName} <noreply@${getDomain()}>`,
      to: clientEmail,
      subject: `Mise à jour de votre demande — ${requestTitle}`,
      html: wrapEmail(content, companyName),
    })
    if (error) throw error
    console.log(`📧 Email mise à jour demande envoyé à ${clientEmail}`)
  } catch (err) {
    console.error(`⚠️ Email mise à jour demande échoué:`, err)
  }
}

/**
 * Invite a newly created team member (ADMIN/MANAGER) to activate their account.
 */
export async function sendUserInvitation(params: {
  email: string
  firstName: string
  activationUrl: string
  companyName: string
}): Promise<void> {
  const { email, firstName, activationUrl, companyName } = params

  const content = `
    <p>Bonjour ${firstName},</p>
    <p>Un compte vient d'être créé pour vous sur <strong>${companyName}</strong>.</p>
    <p>Cliquez sur le bouton ci-dessous pour choisir votre mot de passe et activer votre compte :</p>
    <a href="${activationUrl}" class="cta">Activer mon compte</a>
    <p style="color:#6b7280;font-size:13px;">Ce lien expire dans 7 jours.</p>
    <p>Cordialement,<br/><strong>${companyName}</strong></p>
  `

  try {
    const client = getResend()
    const { error } = await client.emails.send({
      from: `${companyName} <noreply@${getDomain()}>`,
      to: email,
      subject: `Activez votre compte ${companyName}`,
      html: wrapEmail(content, companyName),
    })
    if (error) throw error
    console.log(`📧 Email d'invitation envoyé à ${email}`)
  } catch (err) {
    console.error(`⚠️ Email d'invitation échoué pour ${email}:`, err)
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDomain(): string {
  try {
    return new URL(env.FRONTEND_URL).hostname
  } catch {
    return 'monentreprise.com'
  }
}
