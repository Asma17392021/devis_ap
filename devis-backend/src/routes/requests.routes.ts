import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { listRequests, getRequestCounts, updateRequestStatus } from '../controllers/requests.controller'

const router = Router()

router.use(authenticate)

router.get('/', listRequests)
router.get('/counts', getRequestCounts)
router.patch('/:id', updateRequestStatus)

export { router as requestsRouter }
