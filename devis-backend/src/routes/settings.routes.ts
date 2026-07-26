import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import { getSettings, updateSettings } from '../controllers/settings.controller'

const router = Router()

router.use(authenticate)

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Récupérer les paramètres de l'entreprise
 *     tags: [Paramètres]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paramètres de la compagnie (singleton)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 companyName:
 *                   type: string
 *                 companyEmail:
 *                   type: string
 *                 companyPhone:
 *                   type: string
 *                 companyAddress:
 *                   type: string
 *                 defaultTermsAndConditions:
 *                   type: string
 *                 defaultQuoteValidityDays:
 *                   type: integer
 *                 notifyOnQuoteAccepted:
 *                   type: boolean
 *                 notifyOnQuoteRefused:
 *                   type: boolean
 *                 notifyOnQuoteExpiring:
 *                   type: boolean
 */
router.get('/', getSettings)

/**
 * @swagger
 * /settings:
 *   patch:
 *     summary: Mettre à jour les paramètres de l'entreprise (ADMIN uniquement)
 *     tags: [Paramètres]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyName:
 *                 type: string
 *               companyEmail:
 *                 type: string
 *               companyPhone:
 *                 type: string
 *               companyAddress:
 *                 type: string
 *               defaultTermsAndConditions:
 *                 type: string
 *               defaultQuoteValidityDays:
 *                 type: integer
 *               notifyOnQuoteAccepted:
 *                 type: boolean
 *               notifyOnQuoteRefused:
 *                 type: boolean
 *               notifyOnQuoteExpiring:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Paramètres mis à jour
 *       403:
 *         description: Rôle ADMIN requis
 */
router.patch('/', requireRole('ADMIN'), updateSettings)

export { router as settingsRouter }
