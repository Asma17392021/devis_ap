import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import { listClients, createClient, getClient, updateClient, deleteClient } from '../controllers/clients.controller'

const router = Router()

router.use(authenticate)

/**
 * @swagger
 * /clients:
 *   get:
 *     summary: Liste les clients (pagination + recherche)
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
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
 *         description: Liste paginée des clients
 */
router.get('/', listClients)

/**
 * @swagger
 * /clients:
 *   post:
 *     summary: Créer un client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Client créé
 */
router.post('/', createClient)

/**
 * @swagger
 * /clients/{id}:
 *   get:
 *     summary: Détail d'un client
 *     tags: [Clients]
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
 *         description: Détail client
 *       404:
 *         description: Client introuvable
 */
router.get('/:id', getClient)

/**
 * @swagger
 * /clients/{id}:
 *   patch:
 *     summary: Modifier un client
 *     tags: [Clients]
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
 *         description: Client mis à jour
 */
router.patch('/:id', updateClient)

/**
 * @swagger
 * /clients/{id}:
 *   delete:
 *     summary: Supprimer un client (ADMIN uniquement, sans devis actifs)
 *     tags: [Clients]
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
 *       409:
 *         description: Client a des devis associés
 */
router.delete('/:id', requireRole('ADMIN'), deleteClient)

export { router as clientsRouter }
