const User = require('../models/User');
const { generateToken } = require('../utils/jwt.utils');
const logger = require('../utils/logger');


const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if user already exists
    const userExists = await User.findOne({ 
      $or: [
        { email },
        { username }
      ] 
    });

    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const user = await User.create({
      username,
      email,
      password,
      devices: [{
        deviceId: req.headers['user-agent'] || 'unknown',
        lastLogin: Date.now(),
        userAgent: req.headers['user-agent'] || 'unknown'
      }]
    });

    if (user) {
      // Set user status to online
      user.status = 'online';
      await user.save();

      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        token: generateToken(user._id)
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    logger.error(`Register error: ${error.message}`);
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};


const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email }).select('+password');

    // Check if user exists and password matches
    if (user && (await user.matchPassword(password))) {
      user.status = 'online';
      
      // Check if device already exists in the devices array
      const deviceExists = user.devices.find(
        (device) => device.deviceId === (req.headers['user-agent'] || 'unknown')
      );

      if (deviceExists) {
        deviceExists.lastLogin = Date.now();
      } else {
        user.devices.push({
          deviceId: req.headers['user-agent'] || 'unknown',
          lastLogin: Date.now(),
          userAgent: req.headers['user-agent'] || 'unknown'
        });
      }

      await user.save();

      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        token: generateToken(user._id)
      });
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};


const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    logger.error(`Get current user error: ${error.message}`);
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};


const logoutUser = async (req, res) => {
  try {
    // Update user status to offline
    const user = await User.findById(req.user._id);
    
    if (user) {
      user.status = 'offline';
      user.lastActive = Date.now();
      await user.save();
      
      res.json({ message: 'User logged out successfully' });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    logger.error(`Logout error: ${error.message}`);
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser
};