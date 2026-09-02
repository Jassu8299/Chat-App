const express = require('express')
const statusController = require('../controllers/statusController.js')
const authMiddleware = require('../middleware/authMiddleware')
const { multerMiddleware } = require('../config/cloudinaryConfig.js')

const router = express.Router()

router.post('/', authMiddleware, multerMiddleware, statusController.createStatus)
router.get('/', authMiddleware, statusController.getStatus)

router.put('/:statusId/view', authMiddleware, statusController.viewStatus)

router.delete('/:statusId/', authMiddleware, statusController.deleteStatus)

module.exports = router