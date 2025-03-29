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

// Store tracked vessel data
let trackedVessels = {};

// Start polling for vessel data
function startPolling() {
  // Initial poll
  pollVesselData();
  
  // Set up interval
  setInterval(pollVesselData, POLL_INTERVAL);
  
  // Poll individual tracked vessels
  setInterval(pollTrackedVessels, POLL_INTERVAL);
}

// Poll tracked vessels
async function pollTrackedVessels() {
  if (Object.keys(trackedVessels).length === 0) {
    return; // No vessels being tracked
  }
  
  console.log(`Polling ${Object.keys(trackedVessels).length} tracked vessels...`);
  
  for (const mmsi of Object.keys(trackedVessels)) {
    try {
      const result = await datalasticService.trackVesselByMMSI(mmsi);
      
      if (result.success) {
        trackedVessels[mmsi] = {
          ...result.vessel,
          lastUpdated: new Date().toISOString(),
          cached: result.cached || false
        };
        
        console.log(`Updated tracked vessel MMSI ${mmsi}`);
      } else {
        console.error(`Failed to update tracked vessel MMSI ${mmsi}: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error polling tracked vessel MMSI ${mmsi}:`, error);
    }
  }
}

// Poll for vessel data
async function pollVesselData() {
  try {
    // Fetch all vessels instead of just US vessels
    const { vessels, missingVessels } = await datalasticService.getAllVessels();
    
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

// Get all tracked vessels
router.get('/track', (req, res) => {
  res.json({
    success: true,
    vessels: trackedVessels,
    count: Object.keys(trackedVessels).length
  });
});

// Track vessel by MMSI
router.post('/track', async (req, res) => {
  const { mmsi } = req.body;
  
  if (!mmsi) {
    return res.status(400).json({ error: 'MMSI number is required' });
  }
  
  try {
    // Try to fetch vessel data
    const result = await datalasticService.trackVesselByMMSI(mmsi);
    
    if (result.success) {
      // Add to tracked vessels
      trackedVessels[mmsi] = {
        ...result.vessel,
        lastUpdated: new Date().toISOString(),
        cached: result.cached || false
      };
      
      return res.json({
        success: true,
        vessel: trackedVessels[mmsi]
      });
    } else {
      return res.status(404).json({
        success: false,
        error: result.error || 'No data found for the specified MMSI'
      });
    }
  } catch (error) {
    console.error('Error tracking vessel:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to track vessel'
    });
  }
});

// Get tracked vessel by MMSI
router.get('/track/:mmsi', (req, res) => {
  const { mmsi } = req.params;
  
  if (trackedVessels[mmsi]) {
    return res.json({
      success: true,
      vessel: trackedVessels[mmsi]
    });
  } else {
    return res.status(404).json({
      success: false,
      error: 'Vessel not being tracked'
    });
  }
});

// Stop tracking vessel by MMSI
router.delete('/track/:mmsi', (req, res) => {
  const { mmsi } = req.params;
  
  if (trackedVessels[mmsi]) {
    delete trackedVessels[mmsi];
    return res.json({
      success: true,
      message: 'Vessel tracking stopped'
    });
  } else {
    return res.status(404).json({
      success: false,
      error: 'Vessel not being tracked'
    });
  }
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

// Get vessel by MMSI
router.get('/:mmsi', (req, res) => {
  const { mmsi } = req.params;
  
  const vessel = lastPollData.vessels.find(v => v.mmsi === mmsi);
  
  if (!vessel) {
    return res.status(404).json({ error: 'Vessel not found' });
  }
  
  res.json(vessel);
});

// Start polling on server start
startPolling();

module.exports = router;
