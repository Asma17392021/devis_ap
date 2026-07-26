import { Response } from 'express'

export function success<T>(res: Response, data: T, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data })
}

export function created<T>(res: Response, data: T) {
  return success(res, data, 201)
}

export function noContent(res: Response) {
  return res.status(204).send()
}

export function badRequest(res: Response, message: string, errors?: unknown) {
  return res.status(400).json({ success: false, message, errors })
}

export function unauthorized(res: Response, message = 'Non authentifié') {
  return res.status(401).json({ success: false, message })
}

export function forbidden(res: Response, message = 'Accès interdit') {
  return res.status(403).json({ success: false, message })
}

export function notFound(res: Response, message = 'Ressource introuvable') {
  return res.status(404).json({ success: false, message })
}

export function conflict(res: Response, message: string) {
  return res.status(409).json({ success: false, message })
}

export function serverError(res: Response, error: unknown = 'Erreur serveur interne') {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Erreur serveur interne'
  return res.status(500).json({ success: false, message })
}
