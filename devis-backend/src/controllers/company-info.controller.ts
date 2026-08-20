import { Request, Response } from 'express'
import { prisma } from '../config/prisma'
import { success, serverError } from '../utils/response'

// Public, unauthenticated — only the fields safe to show on a public page
// (e.g. the privacy policy). Never expose SIRET/VAT or internal settings here.
export async function getPublicCompanyInfo(_req: Request, res: Response): Promise<void> {
  try {
    const settings = await prisma.companySettings.findFirst()
    success(res, {
      name: settings?.name ?? 'Autoclick Devis',
      email: settings?.email ?? null,
      phone: settings?.phone ?? null,
      address: settings?.address ?? null,
      city: settings?.city ?? null,
      postalCode: settings?.postalCode ?? null,
      country: settings?.country ?? null,
    })
  } catch (err) {
    serverError(res, err)
  }
}
