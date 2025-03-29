const express = require('express');
const router = express.Router();
const datalasticService = require('../services/datalastic');
const anomalyService = require('../services/anomaly');

// Polling interval in milliseconds (30 seconds)
const POLL_INTERVAL = 30000;

// Store data from last poll
let lastPollData = {
  vessels: [],
  missingVessels: [],
  anomalies: { routeDeviations: [], aisShutoffs: [] },
  lastUpdated: null
};

// Start polling for vessel data
function startPolling() {
  // Initial poll
  pollVesselData();
  
  // Set up interval
  setInterval(pollVesselData, POLL_INTERVAL);
}

// Poll for vessel data
async function pollVesselData() {
  try {
    // Fetch US vessels
    const { vessels, missingVessels } = await datalasticService.getUSVessels();
    
    // Filter vessels by geofence
    const vesselsInGeofence = anomalyService.filterVesselsByGeofence(vessels);
    
    // Detect anomalies
    const anomalies = anomalyService.getAllAnomalies(vesselsInGeofence, missingVessels);
    
    // Update last poll data
    lastPollData = {
      vessels: vesselsInGeofence,
      missingVessels,
      anomalies,
      lastUpdated: new Date().toISOString()
    };
    
    console.log(`Poll completed: ${vesselsInGeofence.length} vessels in geofence, ${anomalies.routeDeviations.length} route deviations, ${anomalies.aisShutoffs.length} AIS shutoffs`);
  } catch (error) {
    console.error('Error polling vessel data:', error);
  }
}

// Get vessels
router.get('/', (req, res) => {
  res.json({
    vessels: lastPollData.vessels,
    count: lastPollData.vessels.length,
    lastUpdated: lastPollData.lastUpdated
  });
});

// Get vessel by MMSI
router.get('/:mmsi', (req, res) => {
  const { mmsi } = req.params;
  
  const vessel = lastPollData.vessels.find(v => v.mmsi === mmsi);
  
  if (!vessel) {
    return res.status(404).json({ error: 'Vessel not found' });
  }
  
  res.json(vessel);
});

// Get anomalies
router.get('/anomalies', (req, res) => {
  res.json({
    anomalies: lastPollData.anomalies,
    lastUpdated: lastPollData.lastUpdated
  });
});

// Get route deviations
router.get('/anomalies/deviations', (req, res) => {
  res.json({
    deviations: lastPollData.anomalies.routeDeviations,
    count: lastPollData.anomalies.routeDeviations.length,
    lastUpdated: lastPollData.lastUpdated
  });
});

// Get AIS shutoffs
router.get('/anomalies/shutoffs', (req, res) => {
  res.json({
    shutoffs: lastPollData.anomalies.aisShutoffs,
    count: lastPollData.anomalies.aisShutoffs.length,
    lastUpdated: lastPollData.lastUpdated
  });
});

// Start polling on server start
startPolling();

module.exports = router;
