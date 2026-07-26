import { Router } from 'express'
import { validatePortalToken } from '../middleware/portal-token.middleware'
import { getPortalQuote, signQuote } from '../controllers/portal.controller'

// Public routes — no JWT authentication
const router = Router()

/**
 * @swagger
 * /client/{token}:
 *   get:
 *     summary: Consulter un devis via le lien sécurisé (portail client, sans authentification)
 *     tags: [Portail Client]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         description: Token de signature UUID unique
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Données du devis (sans notes internes)
 *       404:
 *         description: Lien invalide
 *       400:
 *         description: Devis expiré
 */
router.get('/:token', validatePortalToken, getPortalQuote)

/**
 * @swagger
 * /client/{token}/sign:
 *   post:
 *     summary: Accepter ou refuser un devis (portail client, sans authentification)
 *     tags: [Portail Client]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [decision]
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [ACCEPTED, REFUSED]
 *     responses:
 *       200:
 *         description: Décision enregistrée, PDF régénéré avec mention de signature
 *       400:
 *         description: Devis déjà signé ou statut invalide
 */
router.post('/:token/sign', validatePortalToken, signQuote)

export { router as portalRouter }
