require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize app
const app = express();
const PORT = process.env.PORT || 5050;

// Middleware
app.use(cors({
  origin: '*', // Allow requests from any origin during development
  credentials: true
}));
app.use(express.json());

// Import route modules
const vesselsRoutes = require('./routes/vessels');
const geofenceRoutes = require('./routes/geofence');
const agentRoutes = require('./routes/agent');

// Routes with /api prefix
app.use('/api/vessels', vesselsRoutes);
app.use('/api/geofence', geofenceRoutes);
app.use('/api/agent', agentRoutes);

// Backward compatibility routes without /api prefix
app.use('/vessels', vesselsRoutes);
app.use('/geofence', geofenceRoutes);
app.use('/agent', agentRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'MartinAI API is running' });
});

// Health check without /api prefix for backward compatibility
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'MartinAI API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
