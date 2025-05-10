const express = require('express');
const { getUsers, updateUserStatus } = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', protect, getUsers);
router.put('/status', protect, updateUserStatus);

module.exports = router;