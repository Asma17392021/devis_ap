import jwt from 'jsonwebtoken'
import { env } from '../config/env'

// ─── Admin / Manager tokens ───────────────────────────────────────────────────

export interface JwtPayload {
  userId: string
  email: string
  role: string
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '15m' })
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' })
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload & { type?: string }
  if (decoded.type === 'client') throw new Error('Invalid token type')
  return decoded
}

export function verifyRefreshToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload & { type?: string }
  if (decoded.type === 'client') throw new Error('Invalid token type')
  return decoded
}

// ─── Client tokens ────────────────────────────────────────────────────────────

export interface ClientJwtPayload {
  clientId: string
  accountId: string
  email: string
  type: 'client'
}

export function generateClientAccessToken(payload: ClientJwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '15m' })
}

export function generateClientRefreshToken(payload: ClientJwtPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' })
}

export function verifyClientAccessToken(token: string): ClientJwtPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as ClientJwtPayload
  if (decoded.type !== 'client') throw new Error('Invalid token type')
  return decoded
}

export function verifyClientRefreshToken(token: string): ClientJwtPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as ClientJwtPayload
  if (decoded.type !== 'client') throw new Error('Invalid token type')
  return decoded
}
