require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
// const redisClient = require('./config/redis');

const authRoutes = require('./routes/authRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const aiRoutes = require("./routes/aiRoutes");
const chatRoutes = require('./routes/chatRoutes');

const app = express();

// --- THIS IS THE CRUCIAL CHANGE FOR DEPLOYMENT ---
// We now define a list of allowed URLs (origins)
const allowedOrigins = [
  'http://localhost:3000', // For local development
  // We will add your Vercel URL here later once we have it
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
};

// Use the new, more flexible CORS options
app.use(cors(corsOptions));

app.use(express.json());

connectDB();
// redisClient.connect().catch(console.error);

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/chat', chatRoutes);
app.use("/api/ai", aiRoutes);

// Make sure your server starts on the port provided by Render, with a fallback for local dev
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
