// server/routes/message.routes.js
const express = require('express');
const {
  sendMessage,
  getChatMessages,
  deleteMessage,
  editMessage,
  addReaction,
  markAsRead,
  markAsDelivered
} = require('../controllers/message.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Send a new message
router.post('/', protect, sendMessage);

// Get all messages for a chat
router.get('/:chatId', protect, getChatMessages);

// Delete a message
router.delete('/:messageId', protect, deleteMessage);

// Edit a message
router.put('/:messageId', protect, editMessage);

// Add reaction to a message
router.post('/:messageId/react', protect, addReaction);

// Mark message as read
router.put('/:messageId/read', protect, markAsRead);

// Mark message as delivered
router.put('/:messageId/deliver', protect, markAsDelivered);

module.exports = router;