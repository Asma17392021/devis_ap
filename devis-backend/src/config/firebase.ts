import * as admin from 'firebase-admin'
import { env } from './env'

let initialized = false

export function getFirebaseAdmin(): admin.app.App {
  if (!initialized) {
    if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_PRIVATE_KEY || !env.FIREBASE_CLIENT_EMAIL) {
      throw new Error(
        'Firebase non configuré. Vérifiez FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL dans .env'
      )
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
      }),
    })

    initialized = true
    console.log('✅ Firebase Admin SDK initialisé')
  }

  return admin.app()
}

export function getMessaging(): admin.messaging.Messaging {
  return getFirebaseAdmin().messaging()
}
