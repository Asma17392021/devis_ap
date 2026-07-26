import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { exportExcel, exportPdfList } from '../controllers/export.controller'

const router = Router()

router.use(authenticate)

/**
 * @swagger
 * /export/excel:
 *   get:
 *     summary: Exporter les devis en fichier Excel (.xlsx)
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, SENT, ACCEPTED, REFUSED, EXPIRED]
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Fichier Excel avec colonnes formatées, couleurs statut, ligne de totaux
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/excel', exportExcel)

/**
 * @swagger
 * /export/pdf-list:
 *   get:
 *     summary: Exporter la liste des devis en PDF (tableau récapitulatif)
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, SENT, ACCEPTED, REFUSED, EXPIRED]
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: PDF A4 paysage avec tableau des devis et totaux
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/pdf-list', exportPdfList)

export { router as exportRouter }
