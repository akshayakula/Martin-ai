const { OpenAI } = require('openai');
const datalasticService = require('../services/datalastic');
const anomalyService = require('../services/anomaly');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for the function calling agent
const FUNCTION_CALLING_SYSTEM_PROMPT = `
You are MartinAI, a Maritime Threat Detection Assistant with advanced knowledge of Washington DC area ports, the Chesapeake Bay, and the entire eastern seaboard maritime operations.

When responding to users, you should:

1. Focus on providing comprehensive, detailed information about maritime vessels, ports, and activities in the Washington DC area and eastern seaboard
2. Provide detailed historical context about the maritime significance of the DC area, including the Chesapeake Bay and Potomac River
3. Include thorough analysis of vessel movements, port operations, and regulatory considerations for the region
4. Always format vessel positions in standard latitude/longitude format
5. Present complex data in a detailed, thorough way that highlights all important aspects, not just the most critical ones
6. Use natural language to contextualize and expand upon the data returned from API calls

Your responses should be substantially detailed (at least 3-4 paragraphs). If your answer would be excessively long, provide an initial detailed response and ask if the user would like more specific information on any aspect.

Always end your responses with a question about what specific maritime information the user would like to explore further about the Washington DC area or eastern seaboard.

Remember to focus your knowledge and data specifically on the Washington DC area, Chesapeake Bay, and eastern seaboard maritime operations rather than global marine traffic.
`;

// Function definitions to be used with OpenAI function calling
const functions = [
  {
    name: "getAllVessels",
    description: "Get a list of all vessels without country filtering",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "getUSVessels",
    description: "Get a list of vessels filtered by US country code",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "trackVesselByMMSI",
    description: "Track a specific vessel by MMSI using the Pro API to get detailed information",
    parameters: {
      type: "object",
      properties: {
        mmsi: {
          type: "string",
          description: "The MMSI number of the vessel to track",
        },
      },
      required: ["mmsi"],
    },
  },
  {
    name: "getVesselByIMO",
    description: "Get vessel information by IMO number",
    parameters: {
      type: "object",
      properties: {
        imo: {
          type: "string",
          description: "The IMO number of the vessel",
        },
      },
      required: ["imo"],
    },
  },
  {
    name: "getVesselsInArea",
    description: "Get vessels in a specific area defined by coordinates",
    parameters: {
      type: "object",
      properties: {
        lat1: {
          type: "number",
          description: "South latitude boundary",
        },
        lon1: {
          type: "number",
          description: "West longitude boundary",
        },
        lat2: {
          type: "number",
          description: "North latitude boundary",
        },
        lon2: {
          type: "number",
          description: "East longitude boundary",
        },
      },
      required: ["lat1", "lon1", "lat2", "lon2"],
    },
  },
  {
    name: "searchVesselsByName",
    description: "Search for vessels by name (full or partial)",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The vessel name to search for",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "getVesselHistory",
    description: "Get vessel movement history by MMSI",
    parameters: {
      type: "object",
      properties: {
        mmsi: {
          type: "string",
          description: "The MMSI number of the vessel",
        },
        days: {
          type: "number",
          description: "Number of days of history to retrieve (default: 7)",
        },
      },
      required: ["mmsi"],
    },
  },
  {
    name: "getPortInfo",
    description: "Get port information by name or UNLOCODE",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Port name or UNLOCODE",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "getVesselsInPort",
    description: "Get vessels currently in a port",
    parameters: {
      type: "object",
      properties: {
        portName: {
          type: "string",
          description: "The port name to search for",
        },
      },
      required: ["portName"],
    },
  },
  {
    name: "getAnomalies",
    description: "Get current vessel anomalies like route deviations and AIS shutoffs",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

/**
 * Create a rich context with general maritime information
 */
function generateBaseContext() {
  // Get available API endpoints
  const endpoints = datalasticService.getAvailableEndpoints();
  
  // Format the endpoints as a string
  const endpointList = Object.entries(endpoints)
    .map(([endpoint, description]) => `- ${endpoint}: ${description}`)
    .join('\n');
  
  return `
AVAILABLE MARITIME DATA APIS:
${endpointList}

CURRENT TIME: ${new Date().toISOString()}

You have access to multiple maritime data endpoints. Analyze the user's query and determine the most appropriate endpoint(s) to call.
`;
}

/**
 * Execute a function based on the name and arguments
 * @param {string} functionName - The name of the function to call
 * @param {object} args - The arguments to pass to the function
 */
async function executeFunction(functionName, args) {
  console.log(`Executing function: ${functionName} with args:`, args);
  
  switch (functionName) {
    case 'getAllVessels':
      return await datalasticService.getAllVessels();
    case 'getUSVessels':
      return await datalasticService.getUSVessels();
    case 'trackVesselByMMSI':
      return await datalasticService.trackVesselByMMSI(args.mmsi);
    case 'getVesselByIMO':
      return await datalasticService.getVesselByIMO(args.imo);
    case 'getVesselsInArea':
      return await datalasticService.getVesselsInArea(args.lat1, args.lon1, args.lat2, args.lon2);
    case 'searchVesselsByName':
      return await datalasticService.searchVesselsByName(args.name);
    case 'getVesselHistory':
      return await datalasticService.getVesselHistory(args.mmsi, args.days || 7);
    case 'getPortInfo':
      return await datalasticService.getPortInfo(args.query);
    case 'getVesselsInPort':
      return await datalasticService.getVesselsInPort(args.portName);
    case 'getAnomalies': {
      // Get vessels in geofence
      const { vessels = [] } = await datalasticService.getUSVessels() || { vessels: [] };
      const vesselsInGeofence = vessels.length > 0 ? anomalyService.filterVesselsByGeofence(vessels) : [];
      
      // Get anomalies
      const anomalies = anomalyService.getAllAnomalies(vesselsInGeofence, []);
      
      return {
        vessels: vesselsInGeofence,
        anomalies,
        timestamp: new Date().toISOString()
      };
    }
    default:
      return { error: `Function ${functionName} not found` };
  }
}

/**
 * Process API response data into a natural language format with OpenAI
 * @param {object} data - The data returned from the API
 * @param {string} functionName - The name of the function that was called
 * @param {string} userQuery - The original user query
 */
async function processApiResponseWithAI(data, functionName, userQuery) {
  try {
    // Create a JSON string of the data, limiting size for very large responses
    let dataString = JSON.stringify(data);
    if (dataString.length > 15000) {
      console.log(`Response data too large (${dataString.length} bytes), truncating...`);
      
      // Handle different types of responses for truncation
      if (data.vessels && Array.isArray(data.vessels)) {
        data.vessels = data.vessels.slice(0, 10);
        data._truncated = `Only showing first 10 of ${data.vessels.length} vessels`;
      } else if (data.history && Array.isArray(data.history)) {
        data.history = data.history.slice(0, 10);
        data._truncated = `Only showing first 10 of ${data.history.length} history entries`;
      }
      
      dataString = JSON.stringify(data);
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a maritime data expert assistant. Your task is to convert raw maritime API data into natural language explanations.
          
Focus on clarity and readability in your response. Highlight the key facts and important details while maintaining accuracy.
Omit technical jargon and API terminology. Use maritime terminology appropriately.
Organize information logically. For multiple vessels, provide summaries and key statistics where appropriate.
Keep your response concise but informative, focusing on what would matter most to the user.
Do not mention that you're processing API data - just present the information as if you know it directly.

The user asked: "${userQuery}"
The data was retrieved using the ${functionName} API function.`
        },
        {
          role: "user",
          content: `Here is the data returned from the maritime API:
${dataString}

Present this information in a helpful, natural language format that directly answers my question: "${userQuery}"`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error processing API response with AI:', error);
    return formatResponseData(data, functionName); // Fallback to basic formatting
  }
}

/**
 * Format API response data into a human-readable format
 * (Fallback in case AI processing fails)
 * @param {object} data - The data returned from the API
 * @param {string} functionName - The name of the function that was called
 */
function formatResponseData(data, functionName) {
  switch (functionName) {
    case 'getAllVessels':
    case 'getUSVessels':
      if (data.vessels && data.vessels.length > 0) {
        const vesselCount = data.vessels.length;
        const vesselSummary = data.vessels.slice(0, 5).map(v => 
          `- ${v.name || 'Unnamed'} (MMSI: ${v.mmsi}): Position ${v.lat}, ${v.lon}, Speed: ${v.speed} knots`
        ).join('\n');
        
        return `I found ${vesselCount} vessels. Here are the first few:
${vesselSummary}${vesselCount > 5 ? `\n\n...and ${vesselCount - 5} more vessels.` : ''}`;
      }
      return 'No vessels found in the requested area.';
      
    case 'trackVesselByMMSI':
      if (data.vessel) {
        const v = data.vessel;
        return `Vessel Details:
Name: ${v.name || 'Unknown'}
MMSI: ${v.mmsi || 'N/A'}
IMO: ${v.imo || 'N/A'}
Type: ${v.type || 'Unknown'}
Position: ${v.lat}, ${v.lon}
Speed: ${v.speed} knots
Course: ${v.course || 'N/A'}°
Destination: ${v.destination || 'Unknown'}
ETA: ${v.eta || 'Unknown'}
Status: ${v.status || 'Unknown'}`;
      }
      return 'Could not retrieve vessel information. The vessel might be out of range or the MMSI might be incorrect.';
      
    case 'getVesselByIMO':
      if (data.vessel) {
        const v = data.vessel;
        return `Vessel Details:
Name: ${v.name || 'Unknown'}
IMO: ${v.imo || 'N/A'}
MMSI: ${v.mmsi || 'N/A'}
Type: ${v.type || 'Unknown'}
Flag: ${v.flag || 'Unknown'}
Built: ${v.year_built || 'Unknown'}
GT: ${v.gross_tonnage || 'N/A'}
Length: ${v.length || 'N/A'} m
Beam: ${v.beam || 'N/A'} m`;
      }
      return 'Could not retrieve vessel information. Please check the IMO number.';
      
    case 'getVesselsInArea':
      if (data.vessels && data.vessels.length > 0) {
        const vesselCount = data.vessels.length;
        const vesselSummary = data.vessels.slice(0, 5).map(v => 
          `- ${v.name || 'Unnamed'} (MMSI: ${v.mmsi}): Position ${v.lat}, ${v.lon}, Speed: ${v.speed} knots`
        ).join('\n');
        
        return `I found ${vesselCount} vessels in the specified area. Here are the first few:
${vesselSummary}${vesselCount > 5 ? `\n\n...and ${vesselCount - 5} more vessels.` : ''}`;
      }
      return 'No vessels found in the specified area.';
      
    case 'searchVesselsByName':
      if (data.vessels && data.vessels.length > 0) {
        const vesselCount = data.vessels.length;
        const vesselSummary = data.vessels.slice(0, 5).map(v => 
          `- ${v.name || 'Unnamed'} (MMSI: ${v.mmsi}): Type: ${v.type || 'Unknown'}, Flag: ${v.flag || 'Unknown'}`
        ).join('\n');
        
        return `I found ${vesselCount} vessels matching that name. Here are the first few:
${vesselSummary}${vesselCount > 5 ? `\n\n...and ${vesselCount - 5} more vessels.` : ''}`;
      }
      return 'No vessels found with that name.';
      
    case 'getVesselHistory':
      if (data.history && data.history.length > 0) {
        const historyCount = data.history.length;
        const historySummary = data.history.slice(0, 5).map(h => 
          `- ${new Date(h.timestamp).toLocaleString()}: Position ${h.lat}, ${h.lon}, Speed: ${h.speed} knots, Course: ${h.course}°`
        ).join('\n');
        
        return `I found ${historyCount} historical positions for this vessel. Here are the most recent:
${historySummary}${historyCount > 5 ? `\n\n...and ${historyCount - 5} more historical positions.` : ''}`;
      }
      return 'No historical data found for this vessel.';
      
    case 'getPortInfo':
      if (data.port) {
        const p = data.port;
        return `Port Information:
Name: ${p.name || 'Unknown'}
UNLOCODE: ${p.unlocode || 'N/A'}
Country: ${p.country || 'Unknown'}
Location: ${p.lat}, ${p.lon}
Size: ${p.size || 'Unknown'}
Website: ${p.website || 'N/A'}
Description: ${p.description || 'No description available'}`;
      }
      return 'Could not find information for the specified port.';
      
    case 'getVesselsInPort':
      if (data.vessels && data.vessels.length > 0) {
        const vesselCount = data.vessels.length;
        const vesselSummary = data.vessels.slice(0, 5).map(v => 
          `- ${v.name || 'Unnamed'} (MMSI: ${v.mmsi}): Type: ${v.type || 'Unknown'}, Flag: ${v.flag || 'Unknown'}`
        ).join('\n');
        
        return `I found ${vesselCount} vessels currently in ${data.portName || 'the port'}. Here are some:
${vesselSummary}${vesselCount > 5 ? `\n\n...and ${vesselCount - 5} more vessels.` : ''}`;
      }
      return `No vessels currently detected in ${data.portName || 'the specified port'}.`;
      
    case 'getAnomalies':
      const routeDeviations = data.anomalies?.routeDeviations || [];
      const aisShutoffs = data.anomalies?.aisShutoffs || [];
      
      let response = `I found ${data.vessels?.length || 0} vessels in the monitored zone.\n`;
      
      if (routeDeviations.length > 0) {
        const deviationSummary = routeDeviations.map(d => 
          `- Vessel MMSI ${d.mmsi}: ${d.deviationInfo.distanceNm.toFixed(1)} nautical miles off expected route`
        ).join('\n');
        
        response += `\n${routeDeviations.length} vessels have deviated from their expected routes:\n${deviationSummary}`;
      } else {
        response += '\nNo route deviations detected.';
      }
      
      if (aisShutoffs.length > 0) {
        const shutoffSummary = aisShutoffs.map(s => 
          `- Vessel MMSI ${s.mmsi}: Last seen ${new Date(s.lastSeen).toLocaleString()} at position ${s.lat}, ${s.lon}`
        ).join('\n');
        
        response += `\n\n${aisShutoffs.length} vessels have turned off their AIS transponders:\n${shutoffSummary}`;
      } else {
        response += '\nNo AIS shutoffs detected.';
      }
      
      return response;
      
    default:
      return `Data received from ${functionName}. Please check the API documentation for details on this endpoint.`;
  }
}

/**
 * Process a user message to determine intent and call the appropriate API endpoints
 * @param {string} userMessage - The message from the user
 */
async function processMessage(userMessage) {
  try {
    console.log('Processing user message:', userMessage);
    const baseContext = generateBaseContext();
    
    // Call OpenAI to analyze the message and decide which function to call
    const aiDecision = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: FUNCTION_CALLING_SYSTEM_PROMPT },
        { role: "system", content: baseContext },
        { role: "user", content: userMessage }
      ],
      tools: functions.map(func => ({
        type: "function",
        function: func
      })),
      tool_choice: "auto",
      temperature: 0.2,
    });
    
    const aiResponse = aiDecision.choices[0].message;
    
    // Check if the AI wants to call a function
    if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
      const toolCall = aiResponse.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);
      
      console.log(`AI decided to call ${functionName} with args:`, functionArgs);
      
      // Execute the function
      const apiResult = await executeFunction(functionName, functionArgs);
      
      // Process the API result with OpenAI for natural language response
      const naturalLanguageResponse = await processApiResponseWithAI(apiResult, functionName, userMessage);
      
      return {
        reply: naturalLanguageResponse,
        functionCalled: functionName,
        rawData: apiResult
      };
    } else {
      // If no function was called, return the AI's response directly
      return {
        reply: aiResponse.content,
        functionCalled: null
      };
    }
  } catch (error) {
    console.error('Error processing message:', error);
    return {
      reply: "I'm sorry, I encountered an error while processing your request. Please try again.",
      error: true
    };
  }
}

// Handle multiple API requests in an agentic way
async function processComplexQuery(userMessage) {
  try {
    // First, let's identify what data we need to answer the query
    const planResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: `You are a maritime intelligence agent. Given a user query, identify which maritime data API endpoints would need to be called to fully answer the query.
          
Available endpoints:
- getAllVessels: Get a list of all vessels
- getUSVessels: Get a list of US vessels
- trackVesselByMMSI: Get detailed information about a specific vessel by MMSI
- getVesselByIMO: Get information about a vessel by IMO number
- getVesselsInArea: Get vessels in a specific geographical area
- searchVesselsByName: Search for vessels by name
- getVesselHistory: Get movement history for a vessel
- getPortInfo: Get information about a port
- getVesselsInPort: Get vessels currently in a port
- getAnomalies: Get information about vessel anomalies

For each needed endpoint, specify what parameters would be required.
Output your plan as a JSON array of function calls.`
        },
        { role: "user", content: userMessage }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });
    
    // Parse the plan
    const plan = JSON.parse(planResponse.choices[0].message.content);
    
    if (!plan.functions || !Array.isArray(plan.functions) || plan.functions.length === 0) {
      // If no API calls needed, just process as a regular message
      return await processMessage(userMessage);
    }
    
    // Execute each function in the plan
    const results = [];
    for (const func of plan.functions) {
      try {
        const result = await executeFunction(func.name, func.args || {});
        results.push({
          functionName: func.name,
          args: func.args || {},
          result
        });
      } catch (error) {
        console.error(`Error executing ${func.name}:`, error);
        results.push({
          functionName: func.name,
          args: func.args || {},
          error: error.message
        });
      }
    }
    
    // Now use OpenAI to synthesize all the results into a coherent answer
    const synthesisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a maritime intelligence assistant. Your task is to synthesize multiple API responses into a coherent answer that addresses the user's query.
          
Focus on drawing connections between different data sources and highlighting the most important information.
Present your response in natural language, avoiding technical jargon about APIs or data sources.
Be concise but complete, ensuring you address all aspects of the user's question.`
        },
        {
          role: "user",
          content: `User query: "${userMessage}"
          
Here are the results from multiple maritime data API calls:
${JSON.stringify(results, null, 2)}

Synthesize this information into a comprehensive, natural language response that directly answers the user's query.`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });
    
    return {
      reply: synthesisResponse.choices[0].message.content,
      functionCalled: plan.functions.map(f => f.name).join(', '),
      isComplexQuery: true
    };
  } catch (error) {
    console.error('Error processing complex query:', error);
    // Fallback to regular processing
    return await processMessage(userMessage);
  }
}

module.exports = {
  processMessage,
  processComplexQuery
}; 