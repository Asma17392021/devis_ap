import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import { listUsers, createUser, updateUser, deleteUser } from '../controllers/users.controller'

const router = Router()

router.use(authenticate)

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Liste tous les utilisateurs
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 */
router.get('/', requireRole('ADMIN'), listUsers)

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Créer un utilisateur (ADMIN uniquement)
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MANAGER]
 *     responses:
 *       201:
 *         description: Utilisateur créé
 *       409:
 *         description: Email déjà utilisé
 */
router.post('/', requireRole('ADMIN'), createUser)

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     summary: Modifier un utilisateur (ADMIN ou soi-même)
 *     tags: [Utilisateurs]
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
 *         description: Utilisateur mis à jour
 */
router.patch('/:id', updateUser)

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Supprimer un utilisateur (ADMIN uniquement)
 *     tags: [Utilisateurs]
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
 */
router.delete('/:id', requireRole('ADMIN'), deleteUser)

export { router as usersRouter }
