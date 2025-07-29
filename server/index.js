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



const allowedOrigins = [
  'http://localhost:3000', // For local development
  'https://component-generator-platform-one.vercel.app' // live frontend URL
];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};


app.use(cors(corsOptions));

app.use(express.json());

connectDB();
// redisClient.connect().catch(console.error);

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/chat', chatRoutes);
app.use("/api/ai", aiRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
