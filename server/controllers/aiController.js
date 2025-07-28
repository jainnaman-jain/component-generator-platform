const axios = require("axios");
const Session = require("../models/Session");

const AI_MODEL = "mistralai/mixtral-8x7b-instruct";

const generateComponent = async (req, res) => {
  const { prompt, sessionId } = req.body;

  if (!prompt || !sessionId) {
    return res.status(400).json({ message: "Prompt and sessionId are required." });
  }

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that generates clean and modern React components. Respond only with valid code blocks. Output JSX first, then CSS.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiMessage = response.data.choices[0].message.content;

    // Find session
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    // Update chat history
    session.chatHistory.push({ role: "user", content: prompt });
    session.chatHistory.push({ role: "assistant", content: aiMessage });

    // For now, put entire response in code.jsx, later we can split it properly
    session.code.jsx = aiMessage;
    await session.save();

    res.json({ response: aiMessage });
  } catch (error) {
    console.error("AI generation error:", error?.response?.data || error.message);
    res.status(500).json({ message: "AI generation failed", error: error.message });
  }
};

module.exports = { generateComponent };
