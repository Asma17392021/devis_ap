import { Request, Response } from 'express'
import { prisma } from '../config/prisma'
import { uploadFile, deleteFile, extractPathFromUrl } from '../services/storage.service'
import { created, noContent, notFound, badRequest, serverError } from '../utils/response'

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

// POST /api/quotes/:id/attachments
export async function uploadAttachment(req: Request, res: Response) {
  const { id } = req.params

  if (!req.file) {
    return badRequest(res, 'Aucun fichier fourni')
  }

  if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
    return badRequest(res, `Type de fichier non autorisé : ${req.file.mimetype}`)
  }

  const quote = await prisma.quote.findUnique({ where: { id } })
  if (!quote) return notFound(res, 'Devis introuvable')

  try {
    const timestamp = Date.now()
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `quotes/${id}/attachments/${timestamp}_${safeName}`

    const fileUrl = await uploadFile(req.file.buffer, storagePath, req.file.mimetype)

    const attachment = await prisma.attachment.create({
      data: {
        quoteId: id,
        fileName: req.file.originalname,
        fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
    })

    return created(res, attachment)
  } catch (err) {
    console.error('Erreur upload pièce jointe:', err)
    return serverError(res, 'Erreur lors de l\'upload du fichier')
  }
}

// DELETE /api/quotes/:id/attachments/:attachmentId
export async function deleteAttachment(req: Request, res: Response) {
  const { id, attachmentId } = req.params

  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, quoteId: id },
  })

  if (!attachment) return notFound(res, 'Pièce jointe introuvable')

  try {
    const storagePath = extractPathFromUrl(attachment.fileUrl)
    await deleteFile(storagePath)
  } catch (err) {
    // Log but don't fail — DB record should still be deleted
    console.warn('Erreur suppression fichier Supabase:', err)
  }

  await prisma.attachment.delete({ where: { id: attachmentId } })

  return noContent(res)
}
