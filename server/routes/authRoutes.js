const express = require('express');
const router = express.Router();
const { signup, login, register } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);

module.exports = router;
