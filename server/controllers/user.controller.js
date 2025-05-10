const User = require('../models/User');
const logger = require('../utils/logger');


const getUsers = async (req, res) => {
  try {
    const keyword = req.query.search
      ? {
          $or: [
            { username: { $regex: req.query.search, $options: 'i' } },
            { email: { $regex: req.query.search, $options: 'i' } },
          ],
        }
      : {};

    // Exclude the current user from results
    const users = await User.find({
      ...keyword,
      _id: { $ne: req.user._id },
    }).select('-password');

    res.json(users);
  } catch (error) {
    logger.error(`Get users error: ${error.message}`);
    res.status(500);
    throw new Error(error.message);
  }
};


const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['online', 'offline', 'away', 'busy'].includes(status)) {
      res.status(400);
      throw new Error('Invalid status value');
    }

    const user = await User.findById(req.user._id);

    if (user) {
      user.status = status;
      user.lastActive = Date.now();
      
      const updatedUser = await user.save();
      
      // Return updated user
      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        status: updatedUser.status
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    logger.error(`Update user status error: ${error.message}`);
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};

module.exports = {
  getUsers,
  updateUserStatus
};