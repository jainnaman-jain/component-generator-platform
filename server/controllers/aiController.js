const axios = require("axios");
const Session = require("../models/Session");

const AI_MODEL = "mistralai/mixtral-8x7b-instruct"; // Or your preferred model

// Helper function to parse code from the AI's response
const parseAIResponse = (response) => {
  const codeBlockRegex = /```(jsx|javascript|tsx|css)\s*([\s\S]*?)\s*```/g;
  let jsx = '';
  let css = '';
  const matches = response.matchAll(codeBlockRegex);
  for (const match of matches) {
    const language = match[1].toLowerCase();
    const code = match[2].trim();
    if (['jsx', 'javascript', 'tsx'].includes(language)) {
      jsx = code;
    } else if (language === 'css') {
      css = code;
    }
  }
  return { jsx, css };
};

const generateComponent = async (req, res) => {
  // UPDATED: Now accepts current code for iterative refinement
  const { prompt, sessionId, currentJsx, currentCss } = req.body;

  if (!prompt || !sessionId) {
    return res.status(400).json({ message: "Prompt and sessionId are required." });
  }

  // CRITICAL: Check for the API key before making a call
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('OpenRouter API key is not configured on the server.');
    return res.status(500).json({ message: 'AI service is not configured on the server.' });
  }

  try {
    // --- CONSTRUCT THE PROMPT ---
    let fullPrompt;
    if (currentJsx && currentJsx.trim() !== '') {
      fullPrompt = `A user wants to modify an existing component. Based on the user's request: "${prompt}", please modify the following code. Only respond with the complete, updated code in fenced code blocks (\`\`\`jsx and \`\`\`css). Do not add any extra explanations.

Current JSX:
${currentJsx}

Current CSS:
${currentCss || '/* No CSS provided */'}`;
    } else {
      fullPrompt = `A user wants to create a new component. Based on the user's request: "${prompt}", please create the component code. Only respond with the complete code in fenced code blocks (\`\`\`jsx and \`\`\`css). Do not add any extra explanations.`;
    }

    // --- CALL THE AI SERVICE ---
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content: "You are an expert React developer that generates clean and modern components. You only respond with valid code blocks.",
          },
          {
            role: "user",
            content: fullPrompt, // Use the new, more detailed prompt
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

    // --- UPDATE THE DATABASE ---
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    // 1. Parse the clean code from the response
    const { jsx, css } = parseAIResponse(aiMessage);

    // 2. Save the clean code to the 'code' object
    session.code.jsx = jsx;
    session.code.css = css;

    // 3. Save the full conversational response to the chat history
    session.chatHistory.push({ role: "user", content: prompt });
    session.chatHistory.push({ role: "assistant", content: aiMessage });
    
    await session.save();

    // --- SEND RESPONSE TO FRONTEND ---
    res.json({ response: aiMessage });

  } catch (error) {
    console.error("AI generation error:", error?.response?.data || error.message);
    res.status(500).json({ message: "AI generation failed", error: error.message });
  }
};

module.exports = { generateComponent };