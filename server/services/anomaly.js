const turf = require('@turf/turf');

// Store vessels' previous positions for deviation detection
const vesselPreviousPositions = {};

// In-memory store for geofence
let currentGeofence = null;

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
  if (!currentGeofence || !vessel.lat || !vessel.lon) {
    return false;
  }
  
  const point = turf.point([vessel.lon, vessel.lat]);
  return turf.booleanPointInPolygon(point, currentGeofence);
}

/**
 * Filter vessels by geofence
 * @param {Array} vessels Array of vessel objects
 */
function filterVesselsByGeofence(vessels) {
  if (!currentGeofence) {
    return vessels; // If no geofence is set, return all vessels
  }
  
  return vessels.filter(vessel => isVesselInGeofence(vessel));
}

/**
 * Detect vessel route deviation
 * @param {Object} vessel Current vessel data
 * @param {Number} thresholdNm Deviation threshold in nautical miles
 */
function detectRouteDeviation(vessel, thresholdNm = 5) {
  const { mmsi, lat, lon, course, speed } = vessel;
  
  // Skip if vessel is not moving
  if (speed < 1) {
    return { hasDeviated: false };
  }
  
  // If we have previous positions for this vessel
  if (vesselPreviousPositions[mmsi] && vesselPreviousPositions[mmsi].length >= 2) {
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
 * Get a list of all detected anomalies
 * @param {Array} vessels Current vessel data
 * @param {Array} missingVessels Vessels that disappeared
 */
function getAllAnomalies(vessels, missingVessels) {
  const anomalies = {
    routeDeviations: [],
    aisShutoffs: [],
  };
  
  // Process route deviations
  vessels.forEach(vessel => {
    const deviationResult = detectRouteDeviation(vessel);
    if (deviationResult.hasDeviated) {
      anomalies.routeDeviations.push({
        ...vessel,
        deviationInfo: deviationResult,
      });
    }
  });
  
  // Process AIS shutoffs (missing vessels)
  anomalies.aisShutoffs = missingVessels.filter(vessel => 
    // Only include vessels that were last seen inside geofence
    isVesselInGeofence(vessel)
  );
  
  return anomalies;
}

module.exports = {
  setGeofence,
  getGeofence,
  isVesselInGeofence,
  filterVesselsByGeofence,
  detectRouteDeviation,
  getAllAnomalies
};
