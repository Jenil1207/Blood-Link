const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Atlas Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bloodlink';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB Atlas / Database');
  })
  .catch((err) => {
    console.error('⚠️ MongoDB connection error:', err.message);
    console.log('👉 Please ensure your MONGO_URI in server/.env is correctly configured.');
  });

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'BloodLink API is running smoothly',
    timestamp: new Date()
  });
});

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/donors', require('./routes/donorRoutes'));
app.use('/api/hospitals', require('./routes/hospitalRoutes'));
app.use('/api/camps', require('./routes/campRoutes'));
app.use('/api/sos', require('./routes/sosRoutes'));
app.use('/api/records', require('./routes/recordRoutes'));
app.use('/api/rewards', require('./routes/rewardRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 BloodLink Server running on port ${PORT}`);
});
