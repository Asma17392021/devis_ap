import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { listNotifications, markAsRead, markAllAsRead } from '../controllers/notifications.controller'

const router = Router()

router.use(authenticate)

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Liste les notifications de l'utilisateur connecté (non lues en premier)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des notifications avec compteur non lues
 */
router.get('/', listNotifications)

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Marquer toutes les notifications comme lues
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Toutes marquées comme lues
 */
router.patch('/read-all', markAllAsRead)

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Marquer une notification comme lue
 *     tags: [Notifications]
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
 *         description: Notification mise à jour
 *       404:
 *         description: Notification introuvable
 */
router.patch('/:id/read', markAsRead)

export { router as notificationsRouter }
