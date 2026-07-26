import 'dotenv/config'   // Load .env before anything else
import './config/env'   // Validate env vars
import { app } from './app'
import { env } from './config/env'
import { prisma } from './config/prisma'
import { startExpirationJob } from './jobs/expiration.job'

const PORT = parseInt(env.PORT, 10)

async function bootstrap() {
  try {
    // Test DB connection
    await prisma.$connect()
    console.log('✅ Connexion PostgreSQL établie')

    // Initialize Firebase Admin (non-fatal if not configured)
    if (env.FIREBASE_PROJECT_ID) {
      try {
        const { getFirebaseAdmin } = await import('./config/firebase')
        getFirebaseAdmin()
      } catch (err) {
        console.warn('⚠️ Firebase Admin non initialisé (notifications FCM désactivées):', err)
      }
    } else {
      console.warn('⚠️ FIREBASE_PROJECT_ID non défini — notifications FCM désactivées')
    }

    // Start cron jobs
    startExpirationJob()
    console.log('✅ Cron jobs démarrés')

    // Start server
    app.listen(PORT, () => {
      console.log(`✅ Serveur démarré sur http://localhost:${PORT}`)
      console.log(`📚 Documentation API : http://localhost:${PORT}/api/docs`)
      console.log(`🌍 Environnement : ${env.NODE_ENV}`)
    })
  } catch (error) {
    console.error('❌ Erreur au démarrage:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM reçu, fermeture propre...')
  await prisma.$disconnect()
  process.exit(0)
})

bootstrap()
