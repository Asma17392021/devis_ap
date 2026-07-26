import { Request, Response, NextFunction } from 'express'
import { forbidden } from '../utils/response'

type Role = 'ADMIN' | 'MANAGER'

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return forbidden(res)
    }

    if (!roles.includes(req.user.role as Role)) {
      return forbidden(res, `Rôle requis : ${roles.join(' ou ')}`)
    }

    next()
  }
}
