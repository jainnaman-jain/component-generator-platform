// routes/sessionRoutes.js
const express = require('express');
const router = express.Router();
const {
  createSession,
  getUserSessions,
  getSessionById,
  updateSession,
  deleteSession
} = require('../controllers/sessionController');
const authenticate = require('../middleware/authMiddleware');

router.use(authenticate); // All routes are protected

router.post('/', createSession);
router.get('/', getUserSessions);
router.get('/:id', getSessionById);
router.put('/:id', updateSession);
router.delete('/:id', deleteSession);

module.exports = router;
