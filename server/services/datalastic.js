const axios = require('axios');
const { performance } = require('perf_hooks');

const API_URL = process.env.DATALASTIC_API_URL || 'https://api.datalastic.com/api/v0';
const API_KEY = process.env.DATALASTIC_API_KEY;

// Cache for vessels to compare between polling cycles
let vesselCache = {};
let lastPollTime = 0;

/**
 * Get vessel list filtered by US country code
 */
async function getUSVessels() {
  try {
    const start = performance.now();
    
    const response = await axios.get(`${API_URL}/vessel_list`, {
      params: {
        'api-key': API_KEY,
        'country_iso': 'US'
      }
    });
    
    const end = performance.now();
    console.log(`Fetched ${response.data.length} US vessels in ${(end - start).toFixed(2)}ms`);
    
    // Update timestamps for AIS shutoff detection
    const currentTime = Date.now();
    
    // Update vessel cache
    const newVesselCache = {};
    response.data.forEach(vessel => {
      const { mmsi } = vessel;
      
      // Add timestamp for new vessels
      if (!vesselCache[mmsi]) {
        vessel.firstSeen = currentTime;
      } else {
        // Keep the firstSeen timestamp from previous cache
        vessel.firstSeen = vesselCache[mmsi].firstSeen;
      }
      
      // Update lastSeen timestamp for all vessels
      vessel.lastSeen = currentTime;
      
      // Store in new cache
      newVesselCache[mmsi] = vessel;
    });
    
    // Detect vessels that disappeared since last poll
    const missingVessels = [];
    if (lastPollTime > 0) {
      for (const mmsi in vesselCache) {
        if (!newVesselCache[mmsi]) {
          // Vessel disappeared
          missingVessels.push({
            ...vesselCache[mmsi],
            missingTime: currentTime,
            lastSeenTime: vesselCache[mmsi].lastSeen
          });
        }
      }
    }
    
    // Update cache and last poll time
    vesselCache = newVesselCache;
    lastPollTime = currentTime;
    
    return {
      vessels: Object.values(newVesselCache),
      missingVessels
    };
  } catch (error) {
    console.error('Error fetching US vessels:', error.message);
    return {
      vessels: Object.values(vesselCache),
      missingVessels: [],
      error: error.message
    };
  }
}

module.exports = {
  getUSVessels
};
