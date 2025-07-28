const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { sendMessage } = require('../controllers/chatController');

router.use(auth);
router.post('/', sendMessage);

module.exports = router;