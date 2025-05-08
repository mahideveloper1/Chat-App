// server/socket.js
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Chat = require('./models/Chat');
const Message = require('./models/Message');
const { verifyToken } = require('./utils/jwt.utils');
const config = require('./config');
const logger = require('./utils/logger');

// Store active connections
const activeConnections = new Map();

// Initialize the socket server
const init = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: config.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000
  });

  // Middleware for authentication
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

      // Attach user to the socket
      socket.user = user;
      next();
    } catch (error) {
      logger.error(`Socket auth error: ${error.message}`);
      return next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    logger.info(`User connected: ${userId}`);

    // Add user to active connections
    if (!activeConnections.has(userId)) {
      activeConnections.set(userId, new Set());
    }
    activeConnections.get(userId).add(socket.id);

    // Update user status to online
    try {
      await User.findByIdAndUpdate(userId, { 
        status: 'online',
        lastActive: Date.now()
      });

      // Emit user online status to relevant users
      const userChats = await Chat.find({ users: userId });
      const connectedUsers = new Set();

      userChats.forEach(chat => {
        chat.users.forEach(user => {
          if (user.toString() !== userId) {
            connectedUsers.add(user.toString());
          }
        });
      });

      // Broadcast user's online status to all connected users in their chats
      connectedUsers.forEach(targetUserId => {
        if (activeConnections.has(targetUserId)) {
          activeConnections.get(targetUserId).forEach(socketId => {
            io.to(socketId).emit('user_status_changed', {
              userId: userId,
              status: 'online'
            });
          });
        }
      });

      // Join user to their chat rooms
      userChats.forEach(chat => {
        socket.join(chat._id.toString());
      });

    } catch (error) {
      logger.error(`Error on user connect: ${error.message}`);
    }

    // Listen for joining a chat
    socket.on('join_chat', (chatId) => {
      socket.join(chatId);
      logger.info(`User ${userId} joined chat: ${chatId}`);
      
      // Emit to other users in the chat that this user is online
      socket.to(chatId).emit('user_joined', {
        chatId,
        userId: userId
      });
    });

    // Listen for leaving a chat
    socket.on('leave_chat', (chatId) => {
      socket.leave(chatId);
      logger.info(`User ${userId} left chat: ${chatId}`);
      
      // Emit to other users in the chat that this user left
      socket.to(chatId).emit('user_left', {
        chatId,
        userId: userId
      });
    });

    // Listen for new message
    socket.on('new_message', async (messageData) => {
      try {
        const { chatId, content, attachments } = messageData;

        // Validate required fields
        if (!chatId || !content) {
          socket.emit('error', { message: 'ChatId and content are required' });
          return;
        }

        // Check if chat exists and user is a member
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.users.includes(userId)) {
          socket.emit('error', { message: 'Chat not found or user not authorized' });
          return;
        }

        // Create the new message
        let newMessage = {
          sender: userId,
          content: content,
          chat: chatId,
          deliveredTo: [{ user: userId, deliveredAt: Date.now() }]
        };

        // Add attachments if any
        if (attachments && attachments.length > 0) {
          newMessage.attachments = attachments;
        }

        let message = await Message.create(newMessage);

        // Populate message data
        message = await message.populate('sender', 'username avatar');
        message = await message.populate('chat');
        message = await User.populate(message, {
          path: 'chat.users',
          select: 'username avatar email status'
        });

        // Update lastMessage in the chat
        await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });

        // Update unread counts for all users except the sender
        await Promise.all(
          chat.users
            .filter(chatUserId => chatUserId.toString() !== userId)
            .map(async (chatUserId) => {
              const userUnreadIndex = chat.unreadCounts.findIndex(
                item => item.user.toString() === chatUserId.toString()
              );
              
              if (userUnreadIndex !== -1) {
                chat.unreadCounts[userUnreadIndex].count += 1;
                return chat.save();
              }
            })
        );

        // Emit to all users in the chat
        io.to(chatId).emit('message_received', message);

        // Emit chat update to all users
        const updatedChat = await Chat.findById(chatId)
          .populate('users', '-password')
          .populate('admin', '-password')
          .populate('lastMessage');
          
        const populatedChat = await User.populate(updatedChat, {
          path: 'lastMessage.sender',
          select: 'username avatar email'
        });

        chat.users.forEach(chatUserId => {
          if (activeConnections.has(chatUserId.toString())) {
            activeConnections.get(chatUserId.toString()).forEach(socketId => {
              io.to(socketId).emit('chat_updated', populatedChat);
            });
          }
        });

      } catch (error) {
        logger.error(`New message error: ${error.message}`);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Listen for typing indicator
    socket.on('typing', (chatId) => {
      socket.to(chatId).emit('typing', {
        chatId,
        userId: userId
      });
    });

    // Listen for stop typing
    socket.on('stop_typing', (chatId) => {
      socket.to(chatId).emit('stop_typing', {
        chatId,
        userId: userId
      });
    });

    // Listen for message delivered
    socket.on('message_delivered', async (messageId) => {
      try {
        const message = await Message.findById(messageId);
        
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Check if already delivered
        const alreadyDelivered = message.deliveredTo.some(
          delivery => delivery.user.toString() === userId
        );

        if (!alreadyDelivered) {
          // Add user to deliveredTo
          message.deliveredTo.push({
            user: userId,
            deliveredAt: Date.now()
          });

          await message.save();

          // Emit to all users in the chat
          io.to(message.chat.toString()).emit('message_delivery_updated', {
            messageId: message._id,
            deliveredTo: message.deliveredTo
          });
        }
      } catch (error) {
        logger.error(`Message delivered error: ${error.message}`);
        socket.emit('error', { message: 'Failed to update delivery status' });
      }
    });

    // Listen for message read
    socket.on('message_read', async (messageId) => {
      try {
        const message = await Message.findById(messageId);
        
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Check if already read
        const alreadyRead = message.readBy.some(
          read => read.user.toString() === userId
        );

        if (!alreadyRead) {
          // Add user to readBy
          message.readBy.push({
            user: userId,
            readAt: Date.now()
          });

          await message.save();

          // Emit to all users in the chat
          io.to(message.chat.toString()).emit('message_read_updated', {
            messageId: message._id,
            readBy: message.readBy
          });
        }
      } catch (error) {
        logger.error(`Message read error: ${error.message}`);
        socket.emit('error', { message: 'Failed to update read status' });
      }
    });

    // Listen for message reaction
    socket.on('message_reaction', async ({ messageId, emoji }) => {
      try {
        const message = await Message.findById(messageId);
        
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Check if message is deleted
        if (message.isDeleted) {
          socket.emit('error', { message: 'Cannot react to a deleted message' });
          return;
        }

        // Check if user already reacted with the same emoji
        const existingReaction = message.reactions.findIndex(
          reaction => 
            reaction.user.toString() === userId && 
            reaction.emoji === emoji
        );

        if (existingReaction !== -1) {
          // Remove the reaction if it already exists (toggle)
          message.reactions.splice(existingReaction, 1);
        } else {
          // Add the new reaction
          message.reactions.push({
            user: userId,
            emoji: emoji
          });
        }

        await message.save();

        // Populate the updated reactions
        const updatedMessage = await Message.findById(messageId).populate('reactions.user', 'username avatar');

        // Emit to all users in the chat
        io.to(message.chat.toString()).emit('message_reaction_updated', {
          messageId: message._id,
          reactions: updatedMessage.reactions
        });
      } catch (error) {
        logger.error(`Message reaction error: ${error.message}`);
        socket.emit('error', { message: 'Failed to update reaction' });
      }
    });

    // Listen for online status update
    socket.on('update_status', async (status) => {
      try {
        if (!['online', 'offline', 'away', 'busy'].includes(status)) {
          socket.emit('error', { message: 'Invalid status' });
          return;
        }

        await User.findByIdAndUpdate(userId, { 
          status: status,
          lastActive: Date.now()
        });

        // Find all chats the user is part of
        const userChats = await Chat.find({ users: userId });
        const connectedUsers = new Set();

        userChats.forEach(chat => {
          chat.users.forEach(user => {
            if (user.toString() !== userId) {
              connectedUsers.add(user.toString());
            }
          });
        });

        // Broadcast status to all connected users in their chats
        connectedUsers.forEach(targetUserId => {
          if (activeConnections.has(targetUserId)) {
            activeConnections.get(targetUserId).forEach(socketId => {
              io.to(socketId).emit('user_status_changed', {
                userId: userId,
                status: status
              });
            });
          }
        });
      } catch (error) {
        logger.error(`Update status error: ${error.message}`);
        socket.emit('error', { message: 'Failed to update status' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      logger.info(`User disconnected: ${userId}`);

      // Remove socket from active connections
      if (activeConnections.has(userId)) {
        activeConnections.get(userId).delete(socket.id);
        
        // If no active connections left for this user, update status to offline
        if (activeConnections.get(userId).size === 0) {
          try {
            await User.findByIdAndUpdate(userId, { 
              status: 'offline',
              lastActive: Date.now()
            });

            // Find all chats the user is part of
            const userChats = await Chat.find({ users: userId });
            const connectedUsers = new Set();

            userChats.forEach(chat => {
              chat.users.forEach(user => {
                if (user.toString() !== userId) {
                  connectedUsers.add(user.toString());
                }
              });
            });

            // Broadcast offline status to all connected users in their chats
            connectedUsers.forEach(targetUserId => {
              if (activeConnections.has(targetUserId)) {
                activeConnections.get(targetUserId).forEach(socketId => {
                  io.to(socketId).emit('user_status_changed', {
                    userId: userId,
                    status: 'offline'
                  });
                });
              }
            });
          } catch (error) {
            logger.error(`Error on user disconnect: ${error.message}`);
          }
        }
      }
    });

    // Socket for video call functionality
    
    // Initiate call
    socket.on('call_user', ({ targetUserId, callerId, callerName, roomId, offerSignal }) => {
      if (activeConnections.has(targetUserId)) {
        activeConnections.get(targetUserId).forEach(socketId => {
          io.to(socketId).emit('incoming_call', {
            callerId,
            callerName,
            roomId,
            offerSignal
          });
        });
      }
    });

    // Accept call
    socket.on('accept_call', ({ callerId, roomId, answerSignal }) => {
      if (activeConnections.has(callerId)) {
        activeConnections.get(callerId).forEach(socketId => {
          io.to(socketId).emit('call_accepted', {
            roomId,
            answerSignal
          });
        });
      }
    });

    // Reject call
    socket.on('reject_call', ({ callerId, roomId }) => {
      if (activeConnections.has(callerId)) {
        activeConnections.get(callerId).forEach(socketId => {
          io.to(socketId).emit('call_rejected', {
            roomId
          });
        });
      }
    });
    
    // End call
    socket.on('end_call', ({ roomId, targetUserId }) => {
      if (activeConnections.has(targetUserId)) {
        activeConnections.get(targetUserId).forEach(socketId => {
          io.to(socketId).emit('call_ended', {
            roomId
          });
        });
      }
    });
    
    // Group call signals
    socket.on('join_group_call', ({ roomId, userId }) => {
      socket.join(`call-${roomId}`);
      socket.to(`call-${roomId}`).emit('user_joined_call', { userId });
    });
    
    // New peer in group call
    socket.on('new_peer_signal', ({ roomId, signal, targetUserId }) => {
      if (activeConnections.has(targetUserId)) {
        activeConnections.get(targetUserId).forEach(socketId => {
          io.to(socketId).emit('receive_peer_signal', {
            roomId,
            signal,
            userId: socket.user._id.toString()
          });
        });
      }
    });
    
    // Return signal for group call
    socket.on('return_peer_signal', ({ roomId, signal, targetUserId }) => {
      if (activeConnections.has(targetUserId)) {
        activeConnections.get(targetUserId).forEach(socketId => {
          io.to(socketId).emit('receive_returned_signal', {
            roomId,
            signal,
            userId: socket.user._id.toString()
          });
        });
      }
    });
    
    // Leave group call
    socket.on('leave_group_call', ({ roomId }) => {
      socket.leave(`call-${roomId}`);
      socket.to(`call-${roomId}`).emit('user_left_call', {
        userId: socket.user._id.toString()
      });
    });
  });

  return io;
};

module.exports = { init };