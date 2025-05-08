// server/routes/auth.routes.js
const express = require('express');
const { registerUser, loginUser, getCurrentUser, logoutUser } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getCurrentUser);
router.post('/logout', protect, logoutUser);

module.exports = router;