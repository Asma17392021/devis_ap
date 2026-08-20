import { Router } from 'express'
import { getPublicCompanyInfo } from '../controllers/company-info.controller'

const router = Router()

router.get('/', getPublicCompanyInfo)

export { router as companyInfoRouter }
