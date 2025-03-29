const express = require('express');
const router = express.Router();
const anomalyService = require('../services/anomaly');

// Default geofence - massively expanded to cover eastern shore
const defaultGeofence = [
  [37.5000, -78.5000], // Southwest point - far inland Virginia
  [40.5000, -77.5000], // Northwest point - central Pennsylvania 
  [40.5000, -74.5000], // Northeast point - New Jersey coast
  [37.0000, -75.0000], // Southeast point - Virginia Beach/Norfolk
  [37.5000, -78.5000]  // Close the polygon
];

// In-memory store for phone number
let alertPhoneNumber = null;

// Get current geofence
router.get('/', (req, res) => {
  const geofence = anomalyService.getGeofence();
  
  if (!geofence) {
    // Return default if no geofence set
    return res.json({ 
      geofence: defaultGeofence,
      isDefault: true
    });
  }
  
  res.json({ 
    geofence: geofence.geometry.coordinates[0],
    isDefault: false
  });
});

// Set new geofence
router.post('/', (req, res) => {
  const { coordinates } = req.body;
  
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
    return res.status(400).json({ 
      error: 'Invalid geofence coordinates. Must be an array of [lat, lon] points, minimum 3 points.' 
    });
  }
  
  const result = anomalyService.setGeofence(coordinates);
  
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  
  res.status(201).json({ 
    message: 'Geofence set successfully',
    geofence: coordinates
  });
});

// Set alert phone number
router.post('/alert-phone', (req, res) => {
  const { phoneNumber } = req.body;
  
  if (!phoneNumber || phoneNumber.length < 10) {
    return res.status(400).json({ error: 'Valid phone number is required' });
  }
  
  alertPhoneNumber = phoneNumber;
  
  res.status(200).json({ 
    message: 'Alert phone number set successfully',
    phoneNumber
  });
});

// Get alert phone number
router.get('/alert-phone', (req, res) => {
  res.json({ phoneNumber: alertPhoneNumber });
});

module.exports = router;
