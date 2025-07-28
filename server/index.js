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
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));
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
