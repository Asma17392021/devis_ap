import { Router } from 'express'
import { login, refresh, logout, me, updateMe, updateFcmToken } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Connexion utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connexion réussie, retourne access_token
 *       401:
 *         description: Identifiants incorrects
 */
router.post('/login', login)

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Renouvelle l'access token via le refresh token (cookie)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Nouveau access_token
 *       401:
 *         description: Refresh token invalide
 */
router.post('/refresh', refresh)

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Déconnexion (supprime le refresh token cookie)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Déconnecté
 */
router.post('/logout', logout)

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Retourne le profil de l'utilisateur connecté
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil utilisateur
 *       401:
 *         description: Non authentifié
 */
router.get('/me', authenticate, me)

/**
 * @swagger
 * /auth/me:
 *   patch:
 *     summary: Mettre à jour son propre profil (prénom, langue, etc.)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               preferredLang:
 *                 type: string
 *                 enum: [fr, en]
 *     responses:
 *       200:
 *         description: Profil mis à jour
 */
router.patch('/me', authenticate, updateMe)

/**
 * @swagger
 * /auth/fcm-token:
 *   patch:
 *     summary: Met à jour le token FCM de l'utilisateur (notifications mobiles)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fcmToken]
 *             properties:
 *               fcmToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token mis à jour
 */
router.patch('/fcm-token', authenticate, updateFcmToken)

export { router as authRouter }
