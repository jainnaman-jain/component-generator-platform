// controllers/sessionController.js
const Session = require('../models/Session');

exports.createSession = async (req, res) => {
  try {
    const session = await Session.create({ user: req.user.id });
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ message: 'Session creation failed', error: err.message });
  }
};

exports.getUserSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ user: req.user.id }).sort({ updatedAt: -1 });
    res.status(200).json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch sessions', error: err.message });
  }
};

exports.getSessionById = async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, user: req.user.id });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.status(200).json(session);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch session', error: err.message });
  }
};

exports.updateSession = async (req, res) => {
  try {
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: req.body },
      { new: true }
    );
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.status(200).json(session);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update session', error: err.message });
  }
};

exports.deleteSession = async (req, res) => {
  const sessionId = req.params.id;

  try {
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    // check if the session belongs to the authenticated user
    if (session.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Session.findByIdAndDelete(sessionId);
    res.json({ message: "Session deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete session", error: error.message });
  }
};