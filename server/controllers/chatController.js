const Message = require('../models/Message');
const Component = require('../models/Component');
const callLLM = require('../utils/openRouter');

exports.sendMessage = async (req, res) => {
  const { sessionId, prompt } = req.body;

  try {
    // Save user message
    await Message.create({ sessionId, sender: 'user', content: prompt });

    // Call LLM
    const response = await callLLM(prompt);

    const jsx = extractJSX(response);
    const css = extractCSS(response);

    // Save AI message
    await Message.create({ sessionId, sender: 'ai', content: response });

    // Save component
    await Component.findOneAndUpdate(
      { sessionId },
      { jsx, css, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ jsx, css, response });
  } catch (err) {
    res.status(500).json({ message: 'Chat failed', error: err.message });
  }
};

// Dummy extract functions for now
const extractJSX = (text) => {
  const match = text.match(/```(?:jsx|tsx)?\s*([\s\S]*?)```/);
  return match ? match[1] : '';
};

const extractCSS = (text) => {
  const match = text.match(/```css\s*([\s\S]*?)```/);
  return match ? match[1] : '';
};
