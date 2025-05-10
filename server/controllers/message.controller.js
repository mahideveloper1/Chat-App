const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');
const logger = require('../utils/logger');


const sendMessage = async (req, res) => {
  const { content, chatId, attachments } = req.body;

  if (!content || !chatId) {
    res.status(400);
    throw new Error('Please provide content and chatId');
  }

  try {
    // Find the chat
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      res.status(404);
      throw new Error('Chat not found');
    }
    
    // Check if user is part of the chat
    if (!chat.users.includes(req.user._id)) {
      res.status(403);
      throw new Error('Not authorized to send messages in this chat');
    }

    // Create new message
    let newMessage = {
      sender: req.user._id,
      content: content,
      chat: chatId,
      // Initialize with delivered to the sender
      deliveredTo: [{ user: req.user._id, deliveredAt: Date.now() }]
    };

    // Add attachments if any
    if (attachments && attachments.length > 0) {
      newMessage.attachments = attachments;
    }

    let message = await Message.create(newMessage);

    // Populate sender information
    message = await message.populate('sender', 'username avatar');
    message = await message.populate('chat');
    message = await User.populate(message, {
      path: 'chat.users',
      select: 'username avatar email status'
    });

    // Update lastMessage in the chat
    await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });

    // Update unread counts for all users except the sender
    const bulkOps = chat.users
      .filter(userId => userId.toString() !== req.user._id.toString())
      .map(userId => {
        const userUnreadIndex = chat.unreadCounts.findIndex(
          item => item.user.toString() === userId.toString()
        );
        
        if (userUnreadIndex !== -1) {
          chat.unreadCounts[userUnreadIndex].count += 1;
        }
        
        return {
          updateOne: {
            filter: { 
              _id: chatId, 
              'unreadCounts.user': userId 
            },
            update: { 
              $inc: { 'unreadCounts.$.count': 1 } 
            }
          }
        };
      });

    if (bulkOps.length > 0) {
      await Chat.bulkWrite(bulkOps);
    }

    res.status(201).json(message);
  } catch (error) {
    logger.error(`Send message error: ${error.message}`);
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};


const getChatMessages = async (req, res) => {
  const { chatId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  try {
    // Find the chat
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      res.status(404);
      throw new Error('Chat not found');
    }
    
    // Check if user is part of the chat
    if (!chat.users.includes(req.user._id)) {
      res.status(403);
      throw new Error('Not authorized to access messages in this chat');
    }

    // Reset unread count for this user
    const userUnreadIndex = chat.unreadCounts.findIndex(
      item => item.user.toString() === req.user._id.toString()
    );
    
    if (userUnreadIndex !== -1 && chat.unreadCounts[userUnreadIndex].count > 0) {
      chat.unreadCounts[userUnreadIndex].count = 0;
      await chat.save();
    }

    // Calculate pagination parameters
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get messages with pagination, most recent first
    const messages = await Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('sender', 'username avatar email')
      .populate('readBy.user', 'username')
      .populate('reactions.user', 'username avatar')
      .populate('deliveredTo.user', 'username');

    // Get total count for pagination info
    const totalMessages = await Message.countDocuments({ chat: chatId });

    res.json({
      messages: messages.reverse(), // Reverse to get chronological order
      pagination: {
        total: totalMessages,
        page: parseInt(page),
        pages: Math.ceil(totalMessages / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error(`Get chat messages error: ${error.message}`);
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};


const deleteMessage = async (req, res) => {
  const { messageId } = req.params;

  try {
    const message = await Message.findById(messageId);
    
    if (!message) {
      res.status(404);
      throw new Error('Message not found');
    }
    
    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to delete this message');
    }

    // Soft delete (mark as deleted)
    message.isDeleted = true;
    message.content = "This message has been deleted";
    
    // Clear reactions and attachments
    message.reactions = [];
    message.attachments = [];

    // Save the updated message
    await message.save();

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    logger.error(`Delete message error: ${error.message}`);
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};


const editMessage = async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;

  if (!content) {
    res.status(400);
    throw new Error('Please provide content');
  }

  try {
    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      res.status(404);
      throw new Error('Message not found');
    }
    
    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to edit this message');
    }

    // Check if message is deleted
    if (message.isDeleted) {
      res.status(400);
      throw new Error('Cannot edit a deleted message');
    }

    // Save the old content to edit history
    message.editHistory.push({
      content: message.content,
      editedAt: Date.now()
    });

    // Update content and mark as edited
    message.content = content;
    message.isEdited = true;

    // Save the updated message
    const updatedMessage = await message.save();

    // Populate and return the updated message
    const populatedMessage = await Message.findById(updatedMessage._id)
      .populate('sender', 'username avatar')
      .populate('reactions.user', 'username avatar')
      .populate('readBy.user', 'username')
      .populate('deliveredTo.user', 'username');

    res.json(populatedMessage);
  } catch (error) {
    logger.error(`Edit message error: ${error.message}`);
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};

const addReaction = async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;

  if (!emoji) {
    res.status(400);
    throw new Error('Please provide an emoji');
  }

  try {
    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      res.status(404);
      throw new Error('Message not found');
    }

    // Find the chat to check if user is part of it
    const chat = await Chat.findById(message.chat);
    
    if (!chat.users.includes(req.user._id)) {
      res.status(403);
      throw new Error('Not authorized to react to messages in this chat');
    }

    // Check if message is deleted
    if (message.isDeleted) {
      res.status(400);
      throw new Error('Cannot react to a deleted message');
    }

    // Check if user already reacted with the same emoji
    const existingReaction = message.reactions.findIndex(
      reaction => 
        reaction.user.toString() === req.user._id.toString() && 
        reaction.emoji === emoji
    );

    if (existingReaction !== -1) {
      // Remove the reaction if it already exists (toggle)
      message.reactions.splice(existingReaction, 1);
    } else {
      // Add the new reaction
      message.reactions.push({
        user: req.user._id,
        emoji: emoji
      });
    }

    // Save the updated message
    const updatedMessage = await message.save();

    // Populate and return the updated message
    const populatedMessage = await Message.findById(updatedMessage._id)
      .populate('sender', 'username avatar')
      .populate('reactions.user', 'username avatar')
      .populate('readBy.user', 'username')
      .populate('deliveredTo.user', 'username');

    res.json(populatedMessage);
  } catch (error) {
    logger.error(`Add reaction error: ${error.message}`);
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};


const markAsRead = async (req, res) => {
  const { messageId } = req.params;

  try {
    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      res.status(404);
      throw new Error('Message not found');
    }

    // Find the chat to check if user is part of it
    const chat = await Chat.findById(message.chat);
    
    if (!chat.users.includes(req.user._id)) {
      res.status(403);
      throw new Error('Not authorized to access messages in this chat');
    }

    // Check if the message is already read by this user
    const alreadyRead = message.readBy.some(
      read => read.user.toString() === req.user._id.toString()
    );

    if (!alreadyRead) {
      // Add user to readBy
      message.readBy.push({
        user: req.user._id,
        readAt: Date.now()
      });

      // Save the updated message
      await message.save();
    }

    res.json({ message: 'Message marked as read' });
  } catch (error) {
    logger.error(`Mark as read error: ${error.message}`);
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};


const markAsDelivered = async (req, res) => {
  const { messageId } = req.params;

  try {
    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      res.status(404);
      throw new Error('Message not found');
    }

    // Find the chat to check if user is part of it
    const chat = await Chat.findById(message.chat);
    
    if (!chat.users.includes(req.user._id)) {
      res.status(403);
      throw new Error('Not authorized to access messages in this chat');
    }

    // Check if the message is already delivered to this user
    const alreadyDelivered = message.deliveredTo.some(
      delivery => delivery.user.toString() === req.user._id.toString()
    );

    if (!alreadyDelivered) {
      // Add user to deliveredTo
      message.deliveredTo.push({
        user: req.user._id,
        deliveredAt: Date.now()
      });

      // Save the updated message
      await message.save();
    }

    res.json({ message: 'Message marked as delivered' });
  } catch (error) {
    logger.error(`Mark as delivered error: ${error.message}`);
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};

module.exports = {
  sendMessage,
  getChatMessages,
  deleteMessage,
  editMessage,
  addReaction,
  markAsRead,
  markAsDelivered
};