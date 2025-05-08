// server/services/socket.service.js
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { verifyToken } = require('../utils/jwt.utils');
const config = require('../config');
const logger = require('../utils/logger');

// Store connected clients
const connectedClients = new Map();

// Initialize socket connection
const initSocketService = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: config.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // Attach user to socket
      socket.user = user;
      next();
    } catch (error) {
      logger.error(`Socket auth error: ${error.message}`);
      return next(new Error('Authentication error'));
    }
  });

  // Handle socket connection
  io.on('connection', (socket) => {
    // Store user connection
    const userId = socket.user._id.toString();
    
    logger.info(`User connected: ${userId}`);
    
    // Add client to connected clients map
    if (!connectedClients.has(userId)) {
      connectedClients.set(userId, new Set());
    }
    connectedClients.get(userId).add(socket.id);
    
    // Update user status to online
    updateUserStatus(userId, 'online');
    
    // Join user to their chats
    joinUserChats(socket, userId);
    
    // Set up socket event listeners
    setupEventListeners(io, socket);
    
    // Handle disconnect
    socket.on('disconnect', () => {
      handleDisconnect(io, socket, userId);
    });
  });

  return io;
};

// Update user status
const updateUserStatus = async (userId, status) => {
  try {
    await User.findByIdAndUpdate(userId, { 
      status,
      lastActive: Date.now()
    });
    
    // Find user's chats to notify other users
    const chats = await Chat.find({ users: userId });
    
    // Collect all unique users from these chats
    const usersToNotify = new Set();
    chats.forEach(chat => {
      chat.users.forEach(user => {
        if (user.toString() !== userId) {
          usersToNotify.add(user.toString());
        }
      });
    });
    
    // Notify all connected users about status change
    return {
      userId,
      status,
      usersToNotify: Array.from(usersToNotify)
    };
  } catch (error) {
    logger.error(`Error updating user status: ${error.message}`);
    throw error;
  }
};

// Join user to their chat rooms
const joinUserChats = async (socket, userId) => {
  try {
    const chats = await Chat.find({ users: userId });
    
    chats.forEach(chat => {
      socket.join(chat._id.toString());
    });
  } catch (error) {
    logger.error(`Error joining user chats: ${error.message}`);
  }
};

// Setup socket event listeners
const setupEventListeners = (io, socket) => {
  const userId = socket.user._id.toString();
  
  // Join specific chat
  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    logger.info(`User ${userId} joined chat: ${chatId}`);
  });
  
  // Leave specific chat
  socket.on('leave_chat', (chatId) => {
    socket.leave(chatId);
    logger.info(`User ${userId} left chat: ${chatId}`);
  });
  
  // Send message
  socket.on('send_message', async (messageData) => {
    try {
      const { chatId, content, attachments } = messageData;
      
      // Create message in database
      const newMessage = await Message.create({
        sender: userId,
        content,
        chat: chatId,
        attachments,
        deliveredTo: [{ user: userId }]
      });
      
      // Populate message data
      const populatedMessage = await Message.findById(newMessage._id)
        .populate('sender', 'username avatar')
        .populate('chat');
      
      // Update chat's last message
      await Chat.findByIdAndUpdate(chatId, { lastMessage: newMessage._id });
      
      // Update unread counts for all users except sender
      const chat = await Chat.findById(chatId);
      
      if (chat) {
        // Update unread counts
        chat.users.forEach(chatUserId => {
          if (chatUserId.toString() !== userId) {
            const userUnreadIndex = chat.unreadCounts.findIndex(
              item => item.user.toString() === chatUserId.toString()
            );
            
            if (userUnreadIndex !== -1) {
              chat.unreadCounts[userUnreadIndex].count += 1;
            }
          }
        });
        
        await chat.save();
      }
      
      // Emit message to all users in chat
      io.to(chatId).emit('new_message', populatedMessage);
      
    } catch (error) {
      logger.error(`Error sending message: ${error.message}`);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // Typing indicator
  socket.on('typing', (chatId) => {
    socket.to(chatId).emit('typing', {
      chatId,
      userId
    });
  });
  
  // Stop typing indicator
  socket.on('stop_typing', (chatId) => {
    socket.to(chatId).emit('stop_typing', {
      chatId,
      userId
    });
  });
  
  // Message read
  socket.on('read_message', async (messageId) => {
    try {
      const message = await Message.findById(messageId);
      
      if (!message) {
        return socket.emit('error', { message: 'Message not found' });
      }
      
      // Check if user is part of the chat
      const chat = await Chat.findById(message.chat);
      
      if (!chat || !chat.users.includes(userId)) {
        return socket.emit('error', { message: 'Not authorized' });
      }
      
      // Check if already read
      const alreadyRead = message.readBy.some(read => read.user.toString() === userId);
      
      if (!alreadyRead) {
        message.readBy.push({
          user: userId,
          readAt: Date.now()
        });
        
        await message.save();
        
        // Emit read status update
        io.to(message.chat.toString()).emit('message_read', {
          messageId,
          userId,
          readAt: new Date()
        });
      }
    } catch (error) {
      logger.error(`Error marking message as read: ${error.message}`);
      socket.emit('error', { message: 'Failed to mark message as read' });
    }
  });
  
  // Message delivered
  socket.on('deliver_message', async (messageId) => {
    try {
      const message = await Message.findById(messageId);
      
      if (!message) {
        return socket.emit('error', { message: 'Message not found' });
      }
      
      // Check if user is part of the chat
      const chat = await Chat.findById(message.chat);
      
      if (!chat || !chat.users.includes(userId)) {
        return socket.emit('error', { message: 'Not authorized' });
      }
      
      // Check if already delivered
      const alreadyDelivered = message.deliveredTo.some(
        delivery => delivery.user.toString() === userId
      );
      
      if (!alreadyDelivered) {
        message.deliveredTo.push({
          user: userId,
          deliveredAt: Date.now()
        });
        
        await message.save();
        
        // Emit delivery status update
        io.to(message.chat.toString()).emit('message_delivered', {
          messageId,
          userId,
          deliveredAt: new Date()
        });
      }
    } catch (error) {
      logger.error(`Error marking message as delivered: ${error.message}`);
      socket.emit('error', { message: 'Failed to mark message as delivered' });
    }
  });
  
  // Add reaction
  socket.on('react_to_message', async ({ messageId, emoji }) => {
    try {
      const message = await Message.findById(messageId);
      
      if (!message) {
        return socket.emit('error', { message: 'Message not found' });
      }
      
      // Check if user is part of the chat
      const chat = await Chat.findById(message.chat);
      
      if (!chat || !chat.users.includes(userId)) {
        return socket.emit('error', { message: 'Not authorized' });
      }
      
      // Check if deleted
      if (message.isDeleted) {
        return socket.emit('error', { message: 'Cannot react to deleted message' });
      }
      
      // Check for existing reaction
      const existingReaction = message.reactions.findIndex(
        reaction => reaction.user.toString() === userId && reaction.emoji === emoji
      );
      
      if (existingReaction !== -1) {
        // Remove existing reaction (toggle)
        message.reactions.splice(existingReaction, 1);
      } else {
        // Add new reaction
        message.reactions.push({
          user: userId,
          emoji
        });
      }
      
      await message.save();
      
      // Get populated reactions
      const updatedMessage = await Message.findById(messageId)
        .populate('reactions.user', 'username avatar');
      
      // Emit reaction update
      io.to(message.chat.toString()).emit('message_reaction_updated', {
        messageId,
        reactions: updatedMessage.reactions
      });
    } catch (error) {
      logger.error(`Error reacting to message: ${error.message}`);
      socket.emit('error', { message: 'Failed to add reaction' });
    }
  });
  
  // Update user status
  socket.on('update_status', async (status) => {
    try {
      if (!['online', 'offline', 'away', 'busy'].includes(status)) {
        return socket.emit('error', { message: 'Invalid status' });
      }
      
      const statusUpdate = await updateUserStatus(userId, status);
      
      // Notify relevant users about status change
      statusUpdate.usersToNotify.forEach(targetUserId => {
        if (connectedClients.has(targetUserId)) {
          connectedClients.get(targetUserId).forEach(socketId => {
            io.to(socketId).emit('user_status_changed', {
              userId,
              status
            });
          });
        }
      });
    } catch (error) {
      logger.error(`Error updating status: ${error.message}`);
      socket.emit('error', { message: 'Failed to update status' });
    }
  });
};

// Handle socket disconnect
const handleDisconnect = async (io, socket, userId) => {
  logger.info(`User disconnected: ${userId}`);
  
  // Remove from connected clients
  if (connectedClients.has(userId)) {
    connectedClients.get(userId).delete(socket.id);
    
    // If no more connections for this user, update status to offline
    if (connectedClients.get(userId).size === 0) {
      try {
        const statusUpdate = await updateUserStatus(userId, 'offline');
        
        // Notify relevant users about status change
        statusUpdate.usersToNotify.forEach(targetUserId => {
          if (connectedClients.has(targetUserId)) {
            connectedClients.get(targetUserId).forEach(socketId => {
              io.to(socketId).emit('user_status_changed', {
                userId,
                status: 'offline'
              });
            });
          }
        });
      } catch (error) {
        logger.error(`Error handling disconnect: ${error.message}`);
      }
    }
  }
};

// Get connected clients
const getConnectedClients = () => {
  return connectedClients;
};

module.exports = {
  initSocketService,
  getConnectedClients,
  updateUserStatus
};