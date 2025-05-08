// server/models/Chat.js
const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: [true, 'Chat name is required'],
  },
  isGroupChat: {
    type: Boolean,
    default: false
  },
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  unreadCounts: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    count: {
      type: Number,
      default: 0
    }
  }]
}, {
  timestamps: true
});

// When we create a new chat, ensure we're not creating duplicates for 1:1 chats
ChatSchema.statics.findOneToOneChat = async function(firstUserId, secondUserId) {
  try {
    const chat = await this.findOne({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: firstUserId } } },
        { users: { $elemMatch: { $eq: secondUserId } } }
      ]
    }).populate('users', '-password').populate('lastMessage');
    
    return chat;
  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = mongoose.model('Chat', ChatSchema);