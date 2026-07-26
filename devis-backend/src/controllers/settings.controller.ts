import { Request, Response } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'
import { success, serverError } from '../utils/response'

const updateSettingsSchema = z.object({
  companyName: z.string().min(1).optional(),
  companyEmail: z.string().email().optional().nullable(),
  companyPhone: z.string().optional().nullable(),
  companyAddress: z.string().optional().nullable(),
  companyCity: z.string().optional().nullable(),
  companyPostalCode: z.string().optional().nullable(),
  companyCountry: z.string().optional().nullable(),
  companySiret: z.string().optional().nullable(),
  companyVatNumber: z.string().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  defaultTermsAndConditions: z.string().optional().nullable(),
  defaultQuoteValidityDays: z.number().int().positive().optional(),
  notifyOnQuoteAccepted: z.boolean().optional(),
  notifyOnQuoteRefused: z.boolean().optional(),
  notifyOnQuoteExpiring: z.boolean().optional(),
})

type Settings = Prisma.CompanySettingsGetPayload<object>

// Map DB row → frontend-friendly shape (companyXxx prefix)
function toClientShape(row: Settings) {
  return {
    companyName: row.name,
    companyEmail: row.email,
    companyPhone: row.phone,
    companyAddress: row.address,
    companyCity: row.city,
    companyPostalCode: row.postalCode,
    companyCountry: row.country,
    companySiret: row.siret,
    companyVatNumber: row.vatNumber,
    logoUrl: row.logoUrl,
    defaultTermsAndConditions: row.termsAndConditions,
    defaultQuoteValidityDays: row.defaultQuoteValidityDays,
    notifyOnQuoteAccepted: row.notifyOnQuoteAccepted,
    notifyOnQuoteRefused: row.notifyOnQuoteRefused,
    notifyOnQuoteExpiring: row.notifyOnQuoteExpiring,
  }
}

export async function getSettings(_req: Request, res: Response): Promise<void> {
  try {
    const settings = await prisma.companySettings.findFirst()
    if (!settings) {
      success(res, {})
      return
    }
    success(res, toClientShape(settings))
  } catch (err) {
    serverError(res, err)
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    const data = updateSettingsSchema.parse(req.body)

    // Build the Prisma update payload (mapping companyXxx → DB column names)
    const update: Prisma.CompanySettingsUpdateInput = {}
    if (data.companyName !== undefined)               update.name                    = data.companyName
    if (data.companyEmail !== undefined)              update.email                   = data.companyEmail ?? undefined
    if (data.companyPhone !== undefined)              update.phone                   = data.companyPhone
    if (data.companyAddress !== undefined)            update.address                 = data.companyAddress
    if (data.companyCity !== undefined)               update.city                    = data.companyCity
    if (data.companyPostalCode !== undefined)         update.postalCode              = data.companyPostalCode
    if (data.companyCountry !== undefined)            update.country                 = data.companyCountry ?? undefined
    if (data.companySiret !== undefined)              update.siret                   = data.companySiret
    if (data.companyVatNumber !== undefined)          update.vatNumber               = data.companyVatNumber
    if (data.logoUrl !== undefined)                   update.logoUrl                 = data.logoUrl
    if (data.defaultTermsAndConditions !== undefined) update.termsAndConditions      = data.defaultTermsAndConditions
    if (data.defaultQuoteValidityDays !== undefined)  update.defaultQuoteValidityDays = data.defaultQuoteValidityDays
    if (data.notifyOnQuoteAccepted !== undefined)     update.notifyOnQuoteAccepted   = data.notifyOnQuoteAccepted
    if (data.notifyOnQuoteRefused !== undefined)      update.notifyOnQuoteRefused    = data.notifyOnQuoteRefused
    if (data.notifyOnQuoteExpiring !== undefined)     update.notifyOnQuoteExpiring   = data.notifyOnQuoteExpiring

    const settings = await prisma.companySettings.upsert({
      where: { id: 'singleton' },
      update,
      create: {
        id: 'singleton',
        name: data.companyName ?? 'Mon Entreprise',
        email: (typeof data.companyEmail === 'string' ? data.companyEmail : undefined) ?? 'contact@monentreprise.com',
        phone: data.companyPhone,
        address: data.companyAddress,
        city: data.companyCity,
        postalCode: data.companyPostalCode,
        country: data.companyCountry ?? 'FR',
        siret: data.companySiret,
        vatNumber: data.companyVatNumber,
        logoUrl: data.logoUrl,
        termsAndConditions: data.defaultTermsAndConditions,
        defaultQuoteValidityDays: data.defaultQuoteValidityDays,
        notifyOnQuoteAccepted: data.notifyOnQuoteAccepted,
        notifyOnQuoteRefused: data.notifyOnQuoteRefused,
        notifyOnQuoteExpiring: data.notifyOnQuoteExpiring,
      },
    })

    success(res, toClientShape(settings))
  } catch (err) {
    serverError(res, err)
  }
}
