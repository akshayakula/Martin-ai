const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const datalasticService = require('../services/datalastic');
const anomalyService = require('../services/anomaly');
const intelligentAgent = require('../ai/intelligentAgent');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get data for the agent to use
function getAgentData() {
  try {
    // Get vessels in geofence
    const { vessels = [] } = datalasticService.getUSVessels() || { vessels: [] };
    const vesselsInGeofence = vessels.length > 0 ? anomalyService.filterVesselsByGeofence(vessels) : [];
    
    // Get anomalies
    const anomalies = anomalyService.getAllAnomalies(vesselsInGeofence, []);
    
    return {
      vessels: vesselsInGeofence,
      anomalies,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting agent data:', error);
    return {
      vessels: [],
      anomalies: { routeDeviations: [], aisShutoffs: [] },
      timestamp: new Date().toISOString()
    };
  }
}

// Function to generate context for the AI from current data
function generateAgentContext() {
  const data = getAgentData();
  
  const vesselCount = data.vessels.length;
  const deviationCount = data.anomalies.routeDeviations.length;
  const shutoffCount = data.anomalies.aisShutoffs.length;
  
  // List of vessels as text
  const vesselList = data.vessels.map(v => 
    `MMSI: ${v.mmsi}, Lat: ${v.lat}, Lon: ${v.lon}, Speed: ${v.speed} knots, Course: ${v.course}°, Destination: ${v.destination || 'Unknown'}`
  ).join('\n');
  
  // List of deviations as text
  const deviationList = data.anomalies.routeDeviations.map(d => 
    `MMSI: ${d.mmsi}, Deviation: ${d.deviationInfo.distanceNm.toFixed(1)} nautical miles off expected route`
  ).join('\n');
  
  // List of shutoffs as text
  const shutoffList = data.anomalies.aisShutoffs.map(s => 
    `MMSI: ${s.mmsi}, Last seen: ${new Date(s.lastSeen).toLocaleString()}, Last location: ${s.lat}, ${s.lon}`
  ).join('\n');
  
  // Create the context with all data
  return `
CURRENT MARITIME SITUATION (as of ${new Date().toLocaleString()})
---
Total vessels in monitored zone: ${vesselCount}
Route deviations detected: ${deviationCount} 
AIS signal losses: ${shutoffCount}

VESSEL LIST:
${vesselList || 'No vessels currently in zone.'}

ROUTE DEVIATIONS:
${deviationList || 'No route deviations detected.'}

AIS SHUTOFFS:
${shutoffList || 'No AIS shutoffs detected.'}
---
`;
}

// System prompt for the AI agent
const SYSTEM_PROMPT = `
You are MartinAI, a Maritime Threat Detection Assistant. You analyze vessel data and AIS (Automatic Identification System) information to detect anomalies and potential threats.

Using the provided maritime data, you can:
1. Summarize the current situation in the monitored zone
2. Provide details about specific vessels (by MMSI number)
3. Explain anomalies like route deviations or AIS signal shutoffs
4. Answer questions about vessels' positions, speeds, and behaviors

When asked about vessel information, always provide the most recent data available.
If asked to explain anomalies, prioritize AIS shutoffs and major route deviations.
If the user requests information not available in the current data, politely explain that the information is not available.

IMPORTANT: Your responses should be concise, focused on maritime security, and professional in tone.
`;

// Chat with the agent
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Check if we should handle this as a complex query
    const isComplex = message.includes('and') || 
                      message.includes(',') || 
                      message.toLowerCase().includes('compare') || 
                      message.toLowerCase().includes('between') ||
                      message.toLowerCase().includes('analyze');
    
    let agentResponse;
    
    if (isComplex) {
      // Use the intelligent agent's complex query processor for queries that might need multiple API calls
      console.log('Processing as complex query:', message);
      agentResponse = await intelligentAgent.processComplexQuery(message);
    } else {
      // Use the standard intelligent agent for simpler queries
      console.log('Processing as standard query:', message);
      agentResponse = await intelligentAgent.processMessage(message);
    }
    
    // Check if there was an error with the intelligent agent
    if (agentResponse.error) {
      // Fallback to the simple agent if there was an error with the intelligent agent
      console.log('Falling back to simple agent due to error');
      const context = generateAgentContext();
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: context },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 500
      });
      
      // Return simple agent response
      return res.json({
        reply: completion.choices[0].message.content,
        timestamp: new Date().toISOString(),
        usingFallback: true
      });
    }
    
    // Return intelligent agent response
    res.json({
      reply: agentResponse.reply,
      timestamp: new Date().toISOString(),
      functionCalled: agentResponse.functionCalled,
      isComplexQuery: agentResponse.isComplexQuery || false,
      usingFallback: false
    });
    
  } catch (error) {
    console.error('Agent chat error:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

// Get available Datalastic endpoints
router.get('/endpoints', (req, res) => {
  try {
    const endpoints = datalasticService.getAvailableEndpoints();
    res.json({
      endpoints,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching endpoints:', error);
    res.status(500).json({ error: 'An error occurred while fetching endpoints' });
  }
});

module.exports = router;
