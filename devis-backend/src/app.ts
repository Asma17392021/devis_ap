import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import { env } from './config/env'
import { router } from './routes'
import { errorMiddleware } from './middleware/error.middleware'

const app = express()

// Security headers
app.use(helmet())

// CORS — credentials required for HttpOnly cookie refresh token
// Support multiple origins: comma-separated list in FRONTEND_URL
const allowedOrigins = env.FRONTEND_URL.split(',').map((o) => o.trim())

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true)
    if (allowedOrigins.some((allowed) =>
      allowed === origin ||
      (allowed.endsWith('*') && origin.endsWith(allowed.slice(0, -1)))
    )) {
      return callback(null, true)
    }
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'))
}

// Rate limiting on auth routes only
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de tentatives, réessayez dans une minute.' },
})
app.use('/api/auth', authLimiter)

// Routes
app.use('/api', router)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Global error handler (must be last)
app.use(errorMiddleware)

export { app }
