import React, { useState, useEffect } from 'react';

const DCAreaPorts = () => {
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedPort, setExpandedPort] = useState(null);
  const [showDetailedInfo, setShowDetailedInfo] = useState(false);
  const [selectedPort, setSelectedPort] = useState(null);

  // Fetch ports data
  const fetchPorts = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5050/api/geofence/ports');
      const data = await response.json();
      setPorts(data.ports);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching port data:', err);
      setError('Failed to fetch port data from the server.');
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchPorts();
  }, []);

  // Request detailed port analysis from AI agent
  const requestPortAnalysis = async (port) => {
    try {
      setSelectedPort(port);
      setShowDetailedInfo(true);
      
      // Make API call to agent with specific port data
      const response = await fetch('http://localhost:5050/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Provide a detailed analysis of the ${port.name} in the Washington DC area, including its historical significance, current operations, strategic importance, and relation to eastern seaboard maritime security.`
        })
      });
      
      const data = await response.json();
      
      // We would normally show this in a modal or panel
      console.log('Port Analysis:', data.reply);
      
      // TODO: Display the detailed analysis in the modal
    } catch (error) {
      console.error('Error requesting port analysis:', error);
    }
  };

  return (
    <div className="dc-area-ports">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-green-800">Washington DC Area Ports</h2>
        <p className="text-textSecondary mt-2">
          Key maritime facilities in the nation's capital region, including the Chesapeake Bay and Potomac River areas.
        </p>
      </div>
      
      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accentGreen"></div>
        </div>
      ) : error ? (
        <div className="bg-alertRed bg-opacity-10 text-alertRed p-4 rounded-md">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ports.map(port => (
            <div
              key={port.id}
              className="border border-border rounded-lg overflow-hidden bg-background hover:shadow-md transition-shadow"
            >
              <div className="p-4">
                <h3 className="font-bold text-lg text-green-700">{port.name}</h3>
                <p className="text-sm text-textSecondary mt-1">
                  {port.location[0].toFixed(4)}°, {port.location[1].toFixed(4)}°
                </p>
                <p className="mt-3 text-text">
                  {port.details}
                </p>
                
                <div className="mt-4 flex justify-between">
                  <button
                    onClick={() => setExpandedPort(expandedPort === port.id ? null : port.id)}
                    className="text-green-700 hover:text-green-900 text-sm font-medium"
                  >
                    {expandedPort === port.id ? 'Show Less' : 'Show More'}
                  </button>
                  
                  <button
                    onClick={() => requestPortAnalysis(port)}
                    className="px-3 py-1 bg-green-700 text-white rounded text-sm hover:bg-green-800"
                  >
                    Detailed Analysis
                  </button>
                </div>
                
                {expandedPort === port.id && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h4 className="font-medium text-green-700 mb-2">Port Characteristics</h4>
                    <ul className="text-sm space-y-1 text-textSecondary">
                      <li><span className="font-medium">Type:</span> {port.name.toLowerCase().includes('navy') ? 'Military' : 'Commercial'}</li>
                      <li><span className="font-medium">Waterway:</span> {port.name.toLowerCase().includes('baltimore') ? 'Chesapeake Bay' : 'Potomac River'}</li>
                      <li><span className="font-medium">Facilities:</span> Docks, Warehouses, Loading Equipment</li>
                      <li><span className="font-medium">Security Level:</span> {port.name.toLowerCase().includes('navy') ? 'High (Military)' : 'Standard Commercial'}</li>
                    </ul>
                    
                    <p className="text-sm mt-3">
                      Request a detailed analysis for historical context, strategic significance, and current operational status.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showDetailedInfo && selectedPort && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg shadow-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-green-800">
                {selectedPort.name} - Detailed Analysis
              </h3>
              <button 
                onClick={() => setShowDetailedInfo(false)}
                className="text-textSecondary hover:text-text"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="prose max-w-none">
              <p className="text-textSecondary">
                Loading comprehensive port analysis from AI assistant...
              </p>
              {/* This would be populated with the AI agent's detailed response */}
              
              <h4>Historical Significance</h4>
              <p>Loading historical data...</p>
              
              <h4>Current Operations</h4>
              <p>Loading operational data...</p>
              
              <h4>Strategic Importance</h4>
              <p>Loading strategic assessment...</p>
              
              <h4>Security Considerations</h4>
              <p>Loading security information...</p>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailedInfo(false)}
                className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DCAreaPorts; 