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

  // DC Area port information - fictitious but realistic data for context
  const dcAreaPorts = [
    { name: "Port of Baltimore", status: "Active", vesselCount: 12, cargoTypes: ["Container", "Bulk", "RoRo"] },
    { name: "Alexandria Terminal", status: "Active", vesselCount: 3, cargoTypes: ["Break bulk", "Small container"] },
    { name: "Washington Navy Yard", status: "Restricted", vesselCount: 2, cargoTypes: ["Military", "Support"] },
    { name: "National Harbor", status: "Active", vesselCount: 1, cargoTypes: ["Passenger", "Tourism"] },
    { name: "Port of Washington", status: "Active", vesselCount: 2, cargoTypes: ["Mixed use", "Government"] }
  ];

  // Format DC Area port information
  const portList = dcAreaPorts.map(p => 
    `${p.name}: Status - ${p.status}, Vessels - ${p.vesselCount}, Cargo Types - ${p.cargoTypes.join(", ")}`
  ).join('\n');
  
  // Create the context with all data
  return `
CURRENT WASHINGTON DC AREA MARITIME SITUATION (as of ${new Date().toLocaleString()})
---
Total vessels in DC area monitored zone: ${vesselCount}
Route deviations detected in Potomac/Chesapeake approach: ${deviationCount} 
AIS signal losses near capital region: ${shutoffCount}

DC AREA PORT STATUS:
${portList}

VESSEL LIST (EASTERN SEABOARD FOCUS):
${vesselList || 'No vessels currently in zone.'}

ROUTE DEVIATIONS:
${deviationList || 'No route deviations detected.'}

AIS SHUTOFFS:
${shutoffList || 'No AIS shutoffs detected.'}

REGIONAL NOTES:
- Chesapeake Bay is experiencing moderate vessel traffic typical for the season
- Port of Baltimore operations continuing at normal capacity
- Military vessel movements observed near Naval Support Facility Indian Head
- Regular security patrols active around key DC area maritime infrastructure
---
`;
}

// System prompt for the AI agent
const SYSTEM_PROMPT = `
You are MartinAI, a Maritime Threat Detection Assistant specializing in the Washington DC area, Chesapeake Bay, and the eastern seaboard. You analyze vessel data and AIS (Automatic Identification System) information to detect anomalies and potential threats in this region.

Your expertise covers:
1. The historical and strategic importance of the Port of Baltimore, Alexandria Terminal, Washington Navy Yard, and other maritime facilities in the DC area
2. Comprehensive vessel tracking along the entire eastern seaboard with focus on traffic entering the Chesapeake Bay
3. Deep understanding of maritime security concerns specific to the nation's capital and surrounding waterways
4. Knowledge of commercial and military vessel operations in the Potomac River and Chesapeake Bay
5. Analysis of nautical patterns and route planning for vessels approaching Washington DC

When responding to questions:
- Provide substantial detail and context about the DC area maritime environment
- Include historical background where relevant to vessel movements or port operations
- Analyze data with consideration of the unique security needs of the capital region
- Explain anomalies thoroughly, considering geopolitical implications for the DC area
- Structure responses into multiple detailed paragraphs (minimum 3-4 paragraphs)

If your answer would become excessively long, provide a thorough initial response then ask if the user would like additional details on any specific aspect.

Always end your responses with a question about what specific aspect of Washington DC area maritime operations the user would like to explore further.
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
