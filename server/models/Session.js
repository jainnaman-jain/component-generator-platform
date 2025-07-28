// models/Session.js
const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  }
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default: 'Untitled Session'
  },
  chatHistory: [chatMessageSchema],
  code: {
    jsx: { type: String, default: '' },
    css: { type: String, default: '' }
  },
  state: {
    type: mongoose.Schema.Types.Mixed, // for storing preview/editor state
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
