import { Request, Response, NextFunction } from 'express'
import { verifyClientAccessToken, ClientJwtPayload } from '../utils/jwt'
import { unauthorized } from '../utils/response'

declare global {
  namespace Express {
    interface Request {
      clientAccount?: ClientJwtPayload
    }
  }
}

export function authenticateClient(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorized(res, 'Non authentifié')
  }

  const token = authHeader.slice(7)

  try {
    const payload = verifyClientAccessToken(token)
    req.clientAccount = payload
    next()
  } catch {
    return unauthorized(res, 'Token invalide ou expiré')
  }
}
