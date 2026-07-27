import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import { getStats, getManagerStats } from '../controllers/dashboard.controller'

const router = Router()

router.use(authenticate)

/**
 * @swagger
 * /dashboard/stats:
 *   get:
 *     summary: KPIs et statistiques du tableau de bord
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques du mois (devis créés, en attente, CA signé, taux d'acceptation, devis récents, devis expirant)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 quotesThisMonth:
 *                   type: integer
 *                 pendingQuotes:
 *                   type: integer
 *                 signedRevenueThisMonth:
 *                   type: number
 *                 acceptanceRate:
 *                   type: integer
 *                   description: Pourcentage 0-100
 *                 recentQuotes:
 *                   type: array
 *                 expiringQuotes:
 *                   type: array
 */
router.get('/stats', getStats)
router.get('/managers-stats', requireRole('ADMIN'), getManagerStats)

export { router as dashboardRouter }
