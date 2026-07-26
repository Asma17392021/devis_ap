import { Router } from 'express'
import { authenticateClient } from '../middleware/client-auth.middleware'
import {
  clientRegister,
  clientLogin,
  clientRefresh,
  clientLogout,
  clientMe,
} from '../controllers/client-auth.controller'

const router = Router()

router.post('/register', clientRegister)
router.post('/login', clientLogin)
router.post('/refresh', clientRefresh)
router.post('/logout', clientLogout)
router.get('/me', authenticateClient, clientMe)

export { router as clientAuthRouter }
