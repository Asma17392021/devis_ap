import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional().or(z.literal('')),
  RESEND_API_KEY: z.string().optional(),
  // Verified sender address. Falls back to Resend's shared test domain
  // (works with no setup, but only 'from' side — not fully deliverable-branded)
  // until a real domain is verified at https://resend.com/domains.
  RESEND_FROM_EMAIL: z.string().email().default('onboarding@resend.dev'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  PORT: z.string().default('4000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_FIRST_NAME: z.string().optional(),
  ADMIN_LAST_NAME: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Variables d\'environnement invalides:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
