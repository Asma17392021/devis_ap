import { Router } from 'express'
import multer from 'multer'
import { authenticateClient } from '../middleware/client-auth.middleware'
import {
  getMyQuotes,
  getMyRequests,
  createRequest,
  uploadRequestAttachment,
  deleteRequestAttachment,
} from '../controllers/client-portal.controller'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } })

// All routes require client authentication
router.use(authenticateClient)

router.get('/quotes', getMyQuotes)
router.get('/quote-requests', getMyRequests)
router.post('/quote-requests', createRequest)
router.post('/quote-requests/:id/attachments', upload.single('file'), uploadRequestAttachment)
router.delete('/quote-requests/:id/attachments/:attachmentId', deleteRequestAttachment)

export { router as clientPortalRouter }
