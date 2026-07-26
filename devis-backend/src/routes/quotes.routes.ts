import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import {
  listQuotes, createQuote, getQuote, updateQuote, deleteQuote, sendQuote, downloadPdf,
} from '../controllers/quotes.controller'
import {
  uploadAttachment, deleteAttachment,
} from '../controllers/attachments.controller'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }) // 20MB max

router.use(authenticate)

/**
 * @swagger
 * /quotes:
 *   get:
 *     summary: Liste les devis (filtres + pagination)
 *     tags: [Devis]
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
 *         name: search
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Liste paginée des devis avec totaux calculés
 */
router.get('/', listQuotes)

/**
 * @swagger
 * /quotes:
 *   post:
 *     summary: Créer un devis avec ses lignes
 *     tags: [Devis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId, title, issueDate, expiryDate, lines]
 *             properties:
 *               clientId:
 *                 type: string
 *               title:
 *                 type: string
 *               issueDate:
 *                 type: string
 *                 format: date
 *               expiryDate:
 *                 type: string
 *                 format: date
 *               discount:
 *                 type: number
 *               discountType:
 *                 type: string
 *                 enum: [PERCENTAGE, FIXED]
 *               lines:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Devis créé avec totaux calculés
 */
router.post('/', createQuote)

/**
 * @swagger
 * /quotes/{id}:
 *   get:
 *     summary: Détail complet d'un devis
 *     tags: [Devis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Devis complet avec lignes, client, totaux
 *       404:
 *         description: Devis introuvable
 */
router.get('/:id', getQuote)

/**
 * @swagger
 * /quotes/{id}:
 *   patch:
 *     summary: Modifier un devis (DRAFT ou SENT uniquement)
 *     tags: [Devis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Devis mis à jour
 *       403:
 *         description: Statut ne permet pas la modification
 */
router.patch('/:id', updateQuote)

/**
 * @swagger
 * /quotes/{id}:
 *   delete:
 *     summary: Supprimer un devis (ADMIN, DRAFT uniquement)
 *     tags: [Devis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Supprimé
 *       403:
 *         description: Statut ne permet pas la suppression
 */
router.delete('/:id', requireRole('ADMIN'), deleteQuote)

/**
 * @swagger
 * /quotes/{id}/send:
 *   post:
 *     summary: Envoyer le devis au client (génère PDF + email + FCM)
 *     tags: [Devis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Devis envoyé
 */
router.post('/:id/send', sendQuote)

/**
 * @swagger
 * /quotes/{id}/pdf:
 *   get:
 *     summary: Télécharger le PDF du devis
 *     tags: [Devis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fichier PDF
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/:id/pdf', downloadPdf)

/**
 * @swagger
 * /quotes/{id}/attachments:
 *   post:
 *     summary: Uploader une pièce jointe
 *     tags: [Devis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Pièce jointe uploadée
 */
router.post('/:id/attachments', upload.single('file'), uploadAttachment)

/**
 * @swagger
 * /quotes/{id}/attachments/{attachmentId}:
 *   delete:
 *     summary: Supprimer une pièce jointe
 *     tags: [Devis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Supprimé
 */
router.delete('/:id/attachments/:attachmentId', deleteAttachment)

export { router as quotesRouter }
