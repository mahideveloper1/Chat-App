// server/controllers/chat.controller.js
const Chat = require('../models/Chat');
const User = require('../models/User');
const logger = require('../utils/logger');

// @desc    Create or access one-to-one chat
// @route   POST /api/chats/direct
// @access  Private
const accessOneToOneChat = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400);
    throw new Error("UserId parameter not provided");
  }

  try {
    // Check if chat already exists
    let chat = await Chat.findOneToOneChat(req.user._id, userId);

    if (chat) {
      // Chat exists, return it
      res.json(chat);
    } else {
      // Chat doesn't exist, create a new one
      const targetUser = await User.findById(userId);
      
      if (!targetUser) {
        res.status(404);
        throw new Error("User not found");
      }

      const chatName = `${req.user.username}-${targetUser.username}`;
      
      const newChat = await Chat.create({
        name: chatName,
        isGroupChat: false,
        users: [req.user._id, userId],
        unreadCounts: [
          { user: req.user._id, count: 0 },
          { user: userId, count: 0 }
        ]
      });

      // Populate users field
      const fullChat = await Chat.findById(newChat._id).populate('users', '-password');
      
      res.status(201).json(fullChat);
    }
  } catch (error) {
    logger.error(`Access one-to-one chat error: ${error.message}`);
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};

// @desc    Create group chat
// @route   POST /api/chats/group
// @access  Private
const createGroupChat = async (req, res) => {
  if (!req.body.users || !req.body.name) {
    res.status(400);
    throw new Error("Please provide all required fields");
  }

  let users = req.body.users;

  // Parse the JSON string if it's not already an array
  if (typeof users === 'string') {
    try {
      users = JSON.parse(users);
    } catch (error) {
      res.status(400);
      throw new Error("Invalid users format");
    }
  }

  // Add current user to the group
  users.push(req.user._id);

  try {
    // Create new group chat
    const groupChat = await Chat.create({
      name: req.body.name,
      isGroupChat: true,
      users: users,
      admin: req.user._id,
      unreadCounts: users.map(userId => ({ user: userId, count: 0 }))
    });

    // Populate group chat info
    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate('users', '-password')
      .populate('admin', '-password');

    res.status(201).json(fullGroupChat);
  } catch (error) {
    logger.error(`Create group chat error: ${error.message}`);
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};

// @desc    Get all chats for a user
// @route   GET /api/chats
// @access  Private
const getUserChats = async (req, res) => {
  try {
    // Find all chats that the user is part of
    const chats = await Chat.find({
      users: { $elemMatch: { $eq: req.user._id } }
    })
      .populate('users', '-password')
      .populate('admin', '-password')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    // Populate the sender field in lastMessage
    const populatedChats = await User.populate(chats, {
      path: 'lastMessage.sender',
      select: 'username avatar email'
    });

    res.json(populatedChats);
  } catch (error) {
    logger.error(`Get user chats error: ${error.message}`);
    res.status(500);
    throw new Error(error.message);
  }
};

// @desc    Get specific chat by ID
// @route   GET /api/chats/:chatId
// @access  Private
const getChatById = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId)
      .populate('users', '-password')
      .populate('admin', '-password')
      .populate('lastMessage');

    if (!chat) {
      res.status(404);
      throw new Error('Chat not found');
    }

    // Check if user is part of the chat
    if (!chat.users.some(user => user._id.toString() === req.user._id.toString())) {
      res.status(403);
      throw new Error('Not authorized to access this chat');
    }

    // Populate the sender field in lastMessage
    const populatedChat = await User.populate(chat, {
      path: 'lastMessage.sender',
      select: 'username avatar email'
    });

    // Reset unread count for this user
    const userUnreadIndex = chat.unreadCounts.findIndex(
      item => item.user.toString() === req.user._id.toString()
    );
    
    if (userUnreadIndex !== -1) {
      chat.unreadCounts[userUnreadIndex].count = 0;
      await chat.save();
    }

    res.json(populatedChat);
  } catch (error) {
    logger.error(`Get chat by ID error: ${error.message}`);
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};

// @desc    Update group chat
// @route   PUT /api/chats/group/:chatId
// @access  Private
const updateGroupChat = async (req, res) => {
  const { chatId } = req.params;
  const { name, users } = req.body;

  try {
    // Find the chat
    const chat = await Chat.findById(chatId);

    if (!chat) {
      res.status(404);
      throw new Error('Chat not found');
    }

    // Check if it's a group chat
    if (!chat.isGroupChat) {
      res.status(400);
      throw new Error('This operation is only valid for group chats');
    }

    // Check if the user is the admin
    if (chat.admin.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Only admin can update the group');
    }

    // Update the chat name if provided
    if (name) {
      chat.name = name;
    }

    // Update users if provided
    if (users) {
      let userIds = users;
      
      // Parse the JSON string if it's not already an array
      if (typeof users === 'string') {
        try {
          userIds = JSON.parse(users);
        } catch (error) {
          res.status(400);
          throw new Error('Invalid users format');
        }
      }

      // Make sure admin is included in the users array
      if (!userIds.includes(req.user._id.toString())) {
        userIds.push(req.user._id);
      }

      chat.users = userIds;
      
      // Update unreadCounts to match the new users
      const currentUserIds = chat.unreadCounts.map(item => item.user.toString());
      
      // Remove users who are no longer in the chat
      chat.unreadCounts = chat.unreadCounts.filter(
        item => userIds.includes(item.user.toString())
      );
      
      // Add new users with 0 unread count
      userIds.forEach(userId => {
        if (!currentUserIds.includes(userId.toString())) {
          chat.unreadCounts.push({ user: userId, count: 0 });
        }
      });
    }

    // Save the updated chat
    const updatedChat = await chat.save();

    // Populate and return the updated chat
    const fullChat = await Chat.findById(updatedChat._id)
      .populate('users', '-password')
      .populate('admin', '-password');

    res.json(fullChat);
  } catch (error) {
    logger.error(`Update group chat error: ${error.message}`);
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};

// @desc    Add user to group chat
// @route   PUT /api/chats/group/:chatId/add
// @access  Private
const addToGroup = async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.body;

  try {
    // Find the chat
    const chat = await Chat.findById(chatId);

    if (!chat) {
      res.status(404);
      throw new Error('Chat not found');
    }

    // Check if it's a group chat
    if (!chat.isGroupChat) {
      res.status(400);
      throw new Error('This operation is only valid for group chats');
    }

    // Check if the user is the admin
    if (chat.admin.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Only admin can add users to the group');
    }

    // Check if the user is already in the group
    if (chat.users.includes(userId)) {
      res.status(400);
      throw new Error('User already in the group');
    }

    // Add the user to the group
    chat.users.push(userId);
    
    // Add the user to unreadCounts with 0 count
    chat.unreadCounts.push({ user: userId, count: 0 });

    // Save the updated chat
    const updatedChat = await chat.save();

    // Populate and return the updated chat
    const fullChat = await Chat.findById(updatedChat._id)
      .populate('users', '-password')
      .populate('admin', '-password');

    res.json(fullChat);
  } catch (error) {
    logger.error(`Add to group error: ${error.message}`);
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};

// @desc    Remove user from group chat
// @route   PUT /api/chats/group/:chatId/remove
// @access  Private
const removeFromGroup = async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.body;

  try {
    // Find the chat
    const chat = await Chat.findById(chatId);

    if (!chat) {
      res.status(404);
      throw new Error('Chat not found');
    }

    // Check if it's a group chat
    if (!chat.isGroupChat) {
      res.status(400);
      throw new Error('This operation is only valid for group chats');
    }

    // Check if the requestor is the admin or removing themselves
    if (chat.admin.toString() !== req.user._id.toString() && 
        userId !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Only admin can remove other users from the group');
    }

    // Check if the user is in the group
    if (!chat.users.includes(userId)) {
      res.status(400);
      throw new Error('User not in the group');
    }

    // If admin is leaving, assign a new admin if there are other users
    if (userId === chat.admin.toString()) {
      const otherUsers = chat.users.filter(
        user => user.toString() !== userId.toString()
      );

      if (otherUsers.length > 0) {
        chat.admin = otherUsers[0];
      }
    }

    // Remove the user from the group
    chat.users = chat.users.filter(user => user.toString() !== userId.toString());
    
    // Remove the user from unreadCounts
    chat.unreadCounts = chat.unreadCounts.filter(
      item => item.user.toString() !== userId.toString()
    );

    // If no users left, delete the chat
    if (chat.users.length === 0) {
      await Chat.findByIdAndDelete(chatId);
      return res.json({ message: 'Group chat deleted as no users remain' });
    }

    // Save the updated chat
    const updatedChat = await chat.save();

    // Populate and return the updated chat
    const fullChat = await Chat.findById(updatedChat._id)
      .populate('users', '-password')
      .populate('admin', '-password');

    res.json(fullChat);
  } catch (error) {
    logger.error(`Remove from group error: ${error.message}`);
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};

module.exports = {
  accessOneToOneChat,
  createGroupChat,
  getUserChats,
  getChatById,
  updateGroupChat,
  addToGroup,
  removeFromGroup
};