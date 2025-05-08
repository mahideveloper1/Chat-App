// server/routes/chat.routes.js
const express = require('express');
const {
  accessOneToOneChat,
  createGroupChat,
  getUserChats,
  getChatById,
  updateGroupChat,
  addToGroup,
  removeFromGroup
} = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Get all chats for the logged-in user
router.get('/', protect, getUserChats);

// Get a specific chat by ID
router.get('/:chatId', protect, getChatById);

// Create or access a one-to-one chat
router.post('/direct', protect, accessOneToOneChat);

// Create a group chat
router.post('/group', protect, createGroupChat);

// Update a group chat
router.put('/group/:chatId', protect, updateGroupChat);

// Add a user to a group chat
router.put('/group/:chatId/add', protect, addToGroup);

// Remove a user from a group chat
router.put('/group/:chatId/remove', protect, removeFromGroup);

module.exports = router;