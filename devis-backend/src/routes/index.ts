import { Router } from 'express'
import { authRouter } from './auth.routes'
import { usersRouter } from './users.routes'
import { clientsRouter } from './clients.routes'
import { quotesRouter } from './quotes.routes'
import { portalRouter } from './portal.routes'
import { exportRouter } from './export.routes'
import { dashboardRouter } from './dashboard.routes'
import { notificationsRouter } from './notifications.routes'
import { settingsRouter } from './settings.routes'
import { clientAuthRouter } from './client-auth.routes'
import { clientPortalRouter } from './client-portal.routes'
import { requestsRouter } from './requests.routes'
import { setupSwagger } from '../config/swagger'

const router = Router()

// Mount all route modules
router.use('/auth', authRouter)
router.use('/users', usersRouter)
router.use('/clients', clientsRouter)
router.use('/quotes', quotesRouter)
router.use('/client', portalRouter)          // Public portal (no JWT)
router.use('/client-auth', clientAuthRouter) // Client account auth
router.use('/client-portal', clientPortalRouter) // Client self-service (JWT required)
router.use('/export', exportRouter)
router.use('/dashboard', dashboardRouter)
router.use('/notifications', notificationsRouter)
router.use('/settings', settingsRouter)
router.use('/requests', requestsRouter)  // Admin — client quote requests

// Swagger docs
setupSwagger(router)

export { router }
