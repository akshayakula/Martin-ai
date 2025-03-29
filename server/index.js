require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/vessels', require('./routes/vessels'));
app.use('/api/geofence', require('./routes/geofence'));
app.use('/api/agent', require('./routes/agent'));

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'MartinAI API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
