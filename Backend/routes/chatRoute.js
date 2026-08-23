const express = require('express')
const chatController = require('../controllers/chatController.js')
const authMiddleware = require('../middleware/authMiddleware.js')
const {multerMiddleware} = require('../config/cloudinaryConfig.js')
const router = express.Router()

router.post('/send-message', authMiddleware, chatController.sendMessages);
router.get('/conversations', authMiddleware, chatController.getConversation);
router.get('/conversations/:conversationId/messages', authMiddleware, chatController.getMessages);

router.put('/messages/read', authMiddleware, chatController.markAsRead);
router.delete('/message/:messageId', authMiddleware, chatController.deleteMessage);

module.exports = router;