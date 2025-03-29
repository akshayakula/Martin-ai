const turf = require('@turf/turf');
const emailService = require('./email');

// Store vessels' previous positions for deviation detection
const vesselPreviousPositions = {};

// In-memory store for geofence
let currentGeofence = null;

// Keep track of already alerted anomalies to prevent duplicates
const alertedAnomalies = {
  routeDeviations: new Set(),
  aisShutoffs: new Set()
};

/**
 * Set geofence polygon
 * @param {Array} coordinates Array of [lat, lon] coordinates 
 */
function setGeofence(coordinates) {
  try {
    // Create a GeoJSON polygon from the coordinates
    currentGeofence = turf.polygon([coordinates]);
    return { success: true, geofence: currentGeofence };
  } catch (error) {
    console.error('Error setting geofence:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get current geofence
 */
function getGeofence() {
  return currentGeofence;
}

/**
 * Check if a vessel is inside the geofence
 * @param {Object} vessel Vessel data with lat and lon
 */
function isVesselInGeofence(vessel) {
  if (!currentGeofence) {
    return false;
  }
  
  // Handle different property names that might come from the API
  const lat = vessel.lat || vessel.latitude;
  const lon = vessel.lon || vessel.longitude;
  
  if (!lat || !lon) {
    console.log('Vessel missing lat/lon coordinates:', vessel.mmsi);
    return false;
  }
  
  try {
    const point = turf.point([lon, lat]);
    return turf.booleanPointInPolygon(point, currentGeofence);
  } catch (error) {
    console.error('Error checking if vessel is in geofence:', error.message);
    return false;
  }
}

/**
 * Filter vessels by geofence
 * @param {Array} vessels Array of vessel objects
 */
function filterVesselsByGeofence(vessels) {
  if (!currentGeofence || !Array.isArray(vessels)) {
    return vessels || []; // If no geofence is set or vessels isn't an array, return as is
  }
  
  try {
    // Filter out vessels without valid coordinates before checking geofence
    return vessels.filter(vessel => {
      const lat = vessel.lat || vessel.latitude;
      const lon = vessel.lon || vessel.longitude;
      return lat && lon && isVesselInGeofence(vessel);
    });
  } catch (error) {
    console.error('Error filtering vessels by geofence:', error.message);
    return vessels; // Return original list on error
  }
}

/**
 * Detect vessel route deviation
 * @param {Object} vessel Current vessel data
 * @param {Number} thresholdNm Deviation threshold in nautical miles
 */
function detectRouteDeviation(vessel, thresholdNm = 5) {
  // Handle different property names from API
  const mmsi = vessel.mmsi;
  const lat = vessel.lat || vessel.latitude;
  const lon = vessel.lon || vessel.longitude;
  const course = vessel.course || vessel.heading || 0;
  const speed = vessel.speed || 0;
  
  if (!mmsi || !lat || !lon) {
    return { hasDeviated: false };
  }
  
  // Skip if vessel is not moving
  if (speed < 1) {
    return { hasDeviated: false };
  }
  
  // If we have previous positions for this vessel
  if (vesselPreviousPositions[mmsi] && vesselPreviousPositions[mmsi].length >= 2) {
    try {
      const positions = vesselPreviousPositions[mmsi];
      
      // Create line from previous positions
      const lineCoords = positions.map(pos => [pos.lon, pos.lat]);
      const line = turf.lineString(lineCoords);
      
      // Current position
      const point = turf.point([lon, lat]);
      
      // Calculate distance from expected route
      const distance = turf.pointToLineDistance(point, line, { units: 'nauticalmiles' });
      
      if (distance > thresholdNm) {
        return {
          hasDeviated: true,
          distanceNm: distance,
          expectedRoute: line,
        };
      }
    } catch (error) {
      console.error('Error detecting route deviation:', error.message);
      return { hasDeviated: false };
    }
  }
  
  // Update vessel track (keep last 5 positions)
  if (!vesselPreviousPositions[mmsi]) {
    vesselPreviousPositions[mmsi] = [];
  }
  
  vesselPreviousPositions[mmsi].push({ lat, lon, timestamp: Date.now() });
  
  // Keep only the last 5 positions
  if (vesselPreviousPositions[mmsi].length > 5) {
    vesselPreviousPositions[mmsi].shift();
  }
  
  return { hasDeviated: false };
}

/**
 * Send email alert for a specific anomaly
 * @param {String} anomalyType Type of anomaly (e.g., 'routeDeviation', 'aisShutoff')
 * @param {Object} vessel Vessel data
 * @param {Object} details Additional details about the anomaly
 */
async function sendAnomalyAlert(anomalyType, vessel, details = {}) {
  const vesselName = vessel.name || vessel.shipname || `Unknown (MMSI: ${vessel.mmsi})`;
  const vesselType = vessel.ship_type || vessel.vesselType || 'Unknown';
  
  let subject, message;
  
  switch (anomalyType) {
    case 'routeDeviation':
      subject = `Vessel Route Deviation Detected: ${vesselName}`;
      message = `
        <h3>Vessel Route Deviation Alert</h3>
        <p>A vessel has significantly deviated from its expected route:</p>
        <ul>
          <li><strong>Vessel Name:</strong> ${vesselName}</li>
          <li><strong>MMSI:</strong> ${vessel.mmsi}</li>
          <li><strong>Vessel Type:</strong> ${vesselType}</li>
          <li><strong>Deviation Distance:</strong> ${details.distanceNm.toFixed(2)} nautical miles</li>
          <li><strong>Current Position:</strong> ${vessel.lat || vessel.latitude}, ${vessel.lon || vessel.longitude}</li>
          <li><strong>Speed:</strong> ${vessel.speed || 'Unknown'} knots</li>
          <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        <p>Please investigate this unusual vessel behavior.</p>
      `;
      break;
      
    case 'aisShutoff':
      subject = `AIS Signal Loss Alert: ${vesselName}`;
      message = `
        <h3>AIS Signal Loss Alert</h3>
        <p>A vessel's AIS signal has been lost within the monitored geofence:</p>
        <ul>
          <li><strong>Vessel Name:</strong> ${vesselName}</li>
          <li><strong>MMSI:</strong> ${vessel.mmsi}</li>
          <li><strong>Vessel Type:</strong> ${vesselType}</li>
          <li><strong>Last Known Position:</strong> ${vessel.lat || vessel.latitude}, ${vessel.lon || vessel.longitude}</li>
          <li><strong>Last Known Speed:</strong> ${vessel.speed || 'Unknown'} knots</li>
          <li><strong>Last Signal Time:</strong> ${vessel.timestamp ? new Date(vessel.timestamp).toLocaleString() : 'Unknown'}</li>
          <li><strong>Alert Time:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        <p>This could indicate an intentional shutoff or technical issues. Further investigation is recommended.</p>
      `;
      break;
      
    default:
      subject = `Maritime Anomaly Alert: ${vesselName}`;
      message = `
        <h3>Maritime Anomaly Alert</h3>
        <p>An anomaly has been detected with vessel ${vesselName} (MMSI: ${vessel.mmsi}).</p>
        <p>Please check the monitoring system for more details.</p>
      `;
  }
  
  try {
    const result = await emailService.sendAlertEmail(subject, message);
    console.log(`Email alert sent for ${anomalyType} anomaly:`, vessel.mmsi);
    return result;
  } catch (error) {
    console.error(`Error sending ${anomalyType} alert email:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a list of all detected anomalies
 * @param {Array} vessels Current vessel data
 * @param {Array} missingVessels Vessels that disappeared
 * @param {Boolean} sendAlerts Whether to send email alerts for new anomalies
 */
function getAllAnomalies(vessels, missingVessels, sendAlerts = true) {
  const anomalies = {
    routeDeviations: [],
    aisShutoffs: [],
  };
  
  try {
    // Ensure arrays for safety
    const validVessels = Array.isArray(vessels) ? vessels : [];
    const validMissingVessels = Array.isArray(missingVessels) ? missingVessels : [];
    
    // Process route deviations
    validVessels.forEach(vessel => {
      if (!vessel || !vessel.mmsi) return; // Skip invalid vessels
      
      const deviationResult = detectRouteDeviation(vessel);
      if (deviationResult.hasDeviated) {
        anomalies.routeDeviations.push({
          ...vessel,
          deviationInfo: deviationResult,
        });
        
        // Send alert if enabled and we haven't alerted about this vessel yet
        if (sendAlerts && !alertedAnomalies.routeDeviations.has(vessel.mmsi)) {
          sendAnomalyAlert('routeDeviation', vessel, deviationResult);
          alertedAnomalies.routeDeviations.add(vessel.mmsi);
        }
      }
    });
    
    // Process AIS shutoffs (missing vessels)
    anomalies.aisShutoffs = validMissingVessels.filter(vessel => 
      vessel && vessel.mmsi && 
      // Only include vessels that were last seen inside geofence
      isVesselInGeofence(vessel)
    );
    
    // Send alerts for AIS shutoffs
    if (sendAlerts) {
      anomalies.aisShutoffs.forEach(vessel => {
        if (!alertedAnomalies.aisShutoffs.has(vessel.mmsi)) {
          sendAnomalyAlert('aisShutoff', vessel);
          alertedAnomalies.aisShutoffs.add(vessel.mmsi);
        }
      });
    }
  } catch (error) {
    console.error('Error detecting anomalies:', error.message);
  }
  
  return anomalies;
}

/**
 * Clear a specific alert to allow re-alerting
 * @param {String} type Alert type ('routeDeviations' or 'aisShutoffs')
 * @param {String} mmsi Vessel MMSI
 */
function clearAlert(type, mmsi) {
  if (alertedAnomalies[type] && alertedAnomalies[type].has(mmsi)) {
    alertedAnomalies[type].delete(mmsi);
    return true;
  }
  return false;
}

/**
 * Reset all alert tracking to allow fresh alerts
 */
function resetAlerts() {
  alertedAnomalies.routeDeviations.clear();
  alertedAnomalies.aisShutoffs.clear();
  return { success: true };
}

module.exports = {
  setGeofence,
  getGeofence,
  isVesselInGeofence,
  filterVesselsByGeofence,
  detectRouteDeviation,
  getAllAnomalies,
  sendAnomalyAlert,
  clearAlert,
  resetAlerts
};
