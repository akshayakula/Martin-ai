const axios = require('axios');
const { performance } = require('perf_hooks');

const API_URL = process.env.DATALASTIC_API_URL || 'https://api.datalastic.com/api/v0';
const API_KEY = process.env.DATALASTIC_API_KEY;

// Cache for vessels to compare between polling cycles
let vesselCache = {};
let lastPollTime = 0;

// Cache for tracked vessels using Pro API
let trackedVesselsCache = {};

/**
 * Get all vessels without country filtering
 */
async function getAllVessels() {
  try {
    const start = performance.now();
    
    // Using vessel_find endpoint for consistency with getUSVessels
    const response = await axios.get(`${API_URL}/vessel_find`, {
      params: {
        'api-key': API_KEY
        // No country filter
      }
    });
    
    const end = performance.now();
    
    // Check the structure of the response to handle it correctly
    let vessels = [];
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      vessels = response.data.data;
      console.log(`Fetched ${vessels.length} vessels in ${(end - start).toFixed(2)}ms`);
    } else if (Array.isArray(response.data)) {
      vessels = response.data;
      console.log(`Fetched ${vessels.length} vessels in ${(end - start).toFixed(2)}ms`);
    } else {
      console.log(`Received response but no vessels found, response structure might be different`);
      console.log(`Response structure:`, JSON.stringify(response.data).substring(0, 200) + '...');
    }
    
    // Update timestamps for AIS shutoff detection
    const currentTime = Date.now();
    
    // Update vessel cache
    const newVesselCache = {};
    vessels.forEach(vessel => {
      const { mmsi } = vessel;
      
      if (!mmsi) {
        console.log('Vessel without MMSI found, skipping:', vessel);
        return; // Skip vessels without MMSI
      }
      
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
    console.error('Error fetching vessels:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data).substring(0, 500));
    }
    
    return {
      vessels: Object.values(vesselCache),
      missingVessels: [],
      error: error.message
    };
  }
}

/**
 * Get vessel list filtered by US country code
 */
async function getUSVessels() {
  try {
    const start = performance.now();
    
    // Using vessel_find endpoint as specified in the curl command
    const response = await axios.get(`${API_URL}/vessel_find`, {
      params: {
        'api-key': API_KEY,
        'country_iso': 'US'
      }
    });
    
    const end = performance.now();
    
    // Check the structure of the response to handle it correctly
    let vessels = [];
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      vessels = response.data.data;
      console.log(`Fetched ${vessels.length} US vessels in ${(end - start).toFixed(2)}ms`);
    } else if (Array.isArray(response.data)) {
      vessels = response.data;
      console.log(`Fetched ${vessels.length} US vessels in ${(end - start).toFixed(2)}ms`);
    } else {
      console.log(`Received response but no vessels found, response structure might be different`);
      console.log(`Response structure:`, JSON.stringify(response.data).substring(0, 200) + '...');
    }
    
    // Update timestamps for AIS shutoff detection
    const currentTime = Date.now();
    
    // Update vessel cache
    const newVesselCache = {};
    vessels.forEach(vessel => {
      const { mmsi } = vessel;
      
      if (!mmsi) {
        console.log('Vessel without MMSI found, skipping:', vessel);
        return; // Skip vessels without MMSI
      }
      
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
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data).substring(0, 500));
    }
    
    return {
      vessels: Object.values(vesselCache),
      missingVessels: [],
      error: error.message
    };
  }
}

/**
 * Track a specific vessel by MMSI using the Pro API
 * @param {string} mmsi - The MMSI number of the vessel to track
 * @returns {Object} Detailed vessel information
 */
async function trackVesselByMMSI(mmsi) {
  try {
    const start = performance.now();
    
    const response = await axios.get(`${API_URL}/vessel_pro`, {
      params: {
        'api-key': API_KEY,
        'mmsi': mmsi
      }
    });
    
    const end = performance.now();
    console.log(`Fetched pro data for vessel MMSI ${mmsi} in ${(end - start).toFixed(2)}ms`);
    
    // Cache the vessel data with current timestamp
    const currentTime = Date.now();
    
    // If we have data, process it
    if (response.data) {
      const vesselData = response.data;
      
      // Add timestamps for tracking
      if (!trackedVesselsCache[mmsi]) {
        vesselData.firstTracked = currentTime;
      } else {
        vesselData.firstTracked = trackedVesselsCache[mmsi].firstTracked;
      }
      
      vesselData.lastUpdated = currentTime;
      
      // Update cache
      trackedVesselsCache[mmsi] = vesselData;
      
      return {
        vessel: vesselData,
        success: true
      };
    }
    
    // Return cached data if available
    if (trackedVesselsCache[mmsi]) {
      return {
        vessel: trackedVesselsCache[mmsi],
        success: true,
        cached: true
      };
    }
    
    return {
      success: false,
      error: 'No data found for the specified MMSI'
    };
  } catch (error) {
    console.error(`Error tracking vessel MMSI ${mmsi}:`, error.message);
    
    // Return cached data if available
    if (trackedVesselsCache[mmsi]) {
      return {
        vessel: trackedVesselsCache[mmsi],
        success: true,
        cached: true,
        error: error.message
      };
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get vessel information by IMO number
 * @param {string} imo - The IMO number of the vessel
 * @returns {Object} Vessel information
 */
async function getVesselByIMO(imo) {
  try {
    const start = performance.now();
    
    const response = await axios.get(`${API_URL}/vessel_info`, {
      params: {
        'api-key': API_KEY,
        'imo': imo
      }
    });
    
    const end = performance.now();
    console.log(`Fetched vessel info for IMO ${imo} in ${(end - start).toFixed(2)}ms`);
    
    return {
      vessel: response.data,
      success: true
    };
  } catch (error) {
    console.error(`Error fetching vessel by IMO ${imo}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get vessels in a specific area defined by coordinates
 * @param {number} lat1 - South latitude
 * @param {number} lon1 - West longitude
 * @param {number} lat2 - North latitude
 * @param {number} lon2 - East longitude
 * @returns {Object} Vessels in the specified area
 */
async function getVesselsInArea(lat1, lon1, lat2, lon2) {
  try {
    const start = performance.now();
    
    const response = await axios.get(`${API_URL}/vessel_inarea`, {
      params: {
        'api-key': API_KEY,
        'latitude1': lat1,
        'longitude1': lon1, 
        'latitude2': lat2,
        'longitude2': lon2
      }
    });
    
    const end = performance.now();
    console.log(`Fetched vessels in area in ${(end - start).toFixed(2)}ms`);
    
    return {
      vessels: response.data,
      success: true
    };
  } catch (error) {
    console.error('Error fetching vessels in area:', error.message);
    return {
      vessels: [],
      success: false,
      error: error.message
    };
  }
}

/**
 * Search for vessels by name
 * @param {string} name - The name to search for (full or partial)
 * @returns {Object} Matching vessels
 */
async function searchVesselsByName(name) {
  try {
    const start = performance.now();
    
    const response = await axios.get(`${API_URL}/vessel_search`, {
      params: {
        'api-key': API_KEY,
        'name': name
      }
    });
    
    const end = performance.now();
    console.log(`Searched for vessels by name "${name}" in ${(end - start).toFixed(2)}ms`);
    
    return {
      vessels: response.data,
      success: true
    };
  } catch (error) {
    console.error(`Error searching vessels by name "${name}":`, error.message);
    return {
      vessels: [],
      success: false,
      error: error.message
    };
  }
}

/**
 * Get vessel history
 * @param {string} mmsi - The MMSI number of the vessel
 * @param {number} days - Number of days of history to retrieve (optional)
 * @returns {Object} Vessel history information
 */
async function getVesselHistory(mmsi, days = 7) {
  try {
    const start = performance.now();
    
    const response = await axios.get(`${API_URL}/vessel_history`, {
      params: {
        'api-key': API_KEY,
        'mmsi': mmsi,
        'days': days
      }
    });
    
    const end = performance.now();
    console.log(`Fetched history for vessel MMSI ${mmsi} (${days} days) in ${(end - start).toFixed(2)}ms`);
    
    return {
      history: response.data,
      success: true
    };
  } catch (error) {
    console.error(`Error fetching history for vessel MMSI ${mmsi}:`, error.message);
    return {
      history: [],
      success: false,
      error: error.message
    };
  }
}

/**
 * Get port information by name or UNLOCODE
 * @param {string} query - Port name or UNLOCODE
 * @returns {Object} Port information
 */
async function getPortInfo(query) {
  try {
    const start = performance.now();
    
    const response = await axios.get(`${API_URL}/port_info`, {
      params: {
        'api-key': API_KEY,
        'port': query
      }
    });
    
    const end = performance.now();
    console.log(`Fetched port info for "${query}" in ${(end - start).toFixed(2)}ms`);
    
    return {
      portInfo: response.data,
      success: true
    };
  } catch (error) {
    console.error(`Error fetching port info for "${query}":`, error.message);
    return {
      portInfo: null,
      success: false,
      error: error.message
    };
  }
}

/**
 * Get vessels currently in a port
 * @param {string} portName - The port name to search for
 * @returns {Object} Vessels in the specified port
 */
async function getVesselsInPort(portName) {
  try {
    const start = performance.now();
    
    const response = await axios.get(`${API_URL}/port_vessels`, {
      params: {
        'api-key': API_KEY,
        'port': portName
      }
    });
    
    const end = performance.now();
    console.log(`Fetched vessels in port "${portName}" in ${(end - start).toFixed(2)}ms`);
    
    return {
      vessels: response.data,
      success: true
    };
  } catch (error) {
    console.error(`Error fetching vessels in port "${portName}":`, error.message);
    return {
      vessels: [],
      success: false,
      error: error.message
    };
  }
}

/**
 * Get all available endpoints for Datalastic API
 * @returns {Object} Available endpoints and their descriptions
 */
function getAvailableEndpoints() {
  return {
    vessel_list: "Get a list of all vessels",
    vessel_pro: "Get detailed information about a vessel by MMSI",
    vessel_info: "Get vessel information by IMO number",
    vessel_inarea: "Get vessels in a specific area defined by coordinates",
    vessel_search: "Search for vessels by name",
    vessel_history: "Get vessel history by MMSI",
    port_info: "Get port information by name or UNLOCODE",
    port_vessels: "Get vessels currently in a port"
  };
}

module.exports = {
  getUSVessels,
  getAllVessels,
  trackVesselByMMSI,
  getVesselByIMO,
  getVesselsInArea,
  searchVesselsByName,
  getVesselHistory,
  getPortInfo,
  getVesselsInPort,
  getAvailableEndpoints
};
