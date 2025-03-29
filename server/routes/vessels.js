const express = require('express');
const router = express.Router();
const datalasticService = require('../services/datalastic');
const anomalyService = require('../services/anomaly');
const emailService = require('../services/email');

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

// Store data for eastern seaboard vessels
let easternSeaboardVessels = [];
let easternSeaboardLastUpdated = null;

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
    console.log('Polling for vessel data...');
    
    // Use getUSVessels to specifically get US vessels on the eastern seaboard
    const { vessels, missingVessels } = await datalasticService.getUSVessels();
    
    if (!vessels || vessels.length === 0) {
      console.warn('No vessels returned from API call');
    } else {
      console.log(`Received ${vessels.length} vessels from API`);
      
      // Store all vessels for the eastern seaboard view
      easternSeaboardVessels = vessels;
      easternSeaboardLastUpdated = new Date().toISOString();
    }
    
    // Filter vessels by geofence (Washington DC area)
    const vesselsInGeofence = anomalyService.filterVesselsByGeofence(vessels);
    
    console.log(`Filtered to ${vesselsInGeofence.length} vessels in DC area geofence`);
    
    // Detect anomalies and send email alerts (true as third param enables alerts)
    const anomalies = anomalyService.getAllAnomalies(vesselsInGeofence, missingVessels, true);
    
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
    console.error('Error details:', error.message);
    
    // Don't update lastPollData on error to retain previous data
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

// Get all Eastern Seaboard vessels (not filtered by geofence)
router.get('/eastern-seaboard', (req, res) => {
  res.json({
    vessels: easternSeaboardVessels,
    count: easternSeaboardVessels.length,
    lastUpdated: easternSeaboardLastUpdated
  });
});

// Send test alert for a specific vessel
router.post('/test-alert/:mmsi', async (req, res) => {
  const { mmsi } = req.params;
  const { alertType = 'aisShutoff', recipient = 'user' } = req.body;
  
  // Find vessel in tracked vessels first, then in current vessels
  let vessel = trackedVessels[mmsi];
  
  if (!vessel) {
    vessel = lastPollData.vessels.find(v => v.mmsi === mmsi);
  }
  
  // If no vessel found, create a mock one for testing
  if (!vessel) {
    vessel = {
      mmsi: mmsi,
      vessel_name: "MOCK TEST VESSEL",
      lat: 38.8895,
      lon: -77.0353,
      speed: 12.5,
      course: 180,
      vessel_type: "Cargo",
      destination: "Washington DC",
      lastSeen: Date.now() - 1800000 // 30 minutes ago
    };
  }
  
  try {
    // Get current email settings
    const emailSettings = await emailService.getEmails();
    const { userEmail, coastGuardEmail } = emailSettings;
    
    // If it's a coastGuard alert, temporarily change email configuration to only use coast guard email
    if (recipient === 'coastGuard' && coastGuardEmail) {
      // Save current config
      const tempUserEmail = userEmail;
      
      // Set only coast guard email to be used
      await emailService.setEmails(null, coastGuardEmail);
      
      // Create sample deviation info if route deviation alert
      const deviationInfo = alertType === 'routeDeviation' 
        ? { distanceNm: 7.5 } 
        : {};
      
      // Send test alert
      const result = await anomalyService.sendAnomalyAlert(alertType, vessel, deviationInfo);
      
      // Restore original email configuration
      await emailService.setEmails(tempUserEmail, coastGuardEmail);
      
      if (result.success) {
        return res.json({
          success: true,
          message: `Test ${alertType} alert sent successfully to Coast Guard`,
          messageId: result.messageId
        });
      } else {
        return res.status(400).json({
          success: false,
          error: result.error || 'Failed to send test alert'
        });
      }
    } else {
      // Standard user notification
      // Create sample deviation info if route deviation alert
      const deviationInfo = alertType === 'routeDeviation' 
        ? { distanceNm: 7.5 } 
        : {};
      
      // Send test alert
      const result = await anomalyService.sendAnomalyAlert(alertType, vessel, deviationInfo);
      
      if (result.success) {
        return res.json({
          success: true,
          message: `Test ${alertType} alert sent successfully to Maritime Safety Officer`,
          messageId: result.messageId
        });
      } else {
        return res.status(400).json({
          success: false,
          error: result.error || 'Failed to send test alert'
        });
      }
    }
  } catch (error) {
    console.error('Error sending test alert:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error sending test alert'
    });
  }
});

// Clear a specific alert to allow re-alerting
router.post('/reset-alert/:type/:mmsi', (req, res) => {
  const { type, mmsi } = req.params;
  
  if (!['routeDeviations', 'aisShutoffs'].includes(type)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid alert type. Must be "routeDeviations" or "aisShutoffs".' 
    });
  }
  
  const result = anomalyService.clearAlert(type, mmsi);
  
  res.json({
    success: true,
    cleared: result,
    message: result 
      ? `Alert cleared for ${mmsi}` 
      : `No alert found for ${mmsi} of type ${type}`
  });
});

// Reset all alerts to allow fresh notifications
router.post('/reset-alerts', (req, res) => {
  const result = anomalyService.resetAlerts();
  
  res.json({
    success: true,
    message: 'All alert tracking has been reset'
  });
});

// Start polling on server start
startPolling();

module.exports = router;
