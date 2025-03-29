import React, { useState, useEffect } from 'react';

const EasternSeaboardVessels = () => {
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [filter, setFilter] = useState('all'); // all, cargo, passenger, tanker, etc.
  const [showDetailedInfo, setShowDetailedInfo] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch vessel data from API
  const fetchVessels = async () => {
    try {
      setLoading(true);
      // Use the new eastern-seaboard endpoint for a comprehensive list of vessels
      const response = await fetch('http://localhost:5050/api/vessels/eastern-seaboard');
      const data = await response.json();
      
      if (!data.vessels || data.vessels.length === 0) {
        console.warn('No vessels returned from API');
        setVessels([]);
        setLoading(false);
        return;
      }
      
      console.log(`Received ${data.vessels.length} vessels from eastern seaboard API`);
      
      // Filter out vessels with invalid coordinates
      const validVessels = data.vessels.filter(vessel => {
        const lat = vessel.lat || vessel.latitude;
        const lon = vessel.lon || vessel.longitude;
        return lat != null && lon != null && !isNaN(lat) && !isNaN(lon);
      });
      
      // Sort vessels by their distance to DC (38.9072° N, 77.0369° W)
      const dcLat = 38.9072;
      const dcLon = -77.0369;
      
      const sortedVessels = validVessels.sort((a, b) => {
        // Get lat/lon from either property name format
        const aLat = a.lat || a.latitude || 0;
        const aLon = a.lon || a.longitude || 0;
        const bLat = b.lat || b.latitude || 0;
        const bLon = b.lon || b.longitude || 0;
        
        const distA = Math.sqrt(Math.pow(aLat - dcLat, 2) + Math.pow(aLon - dcLon, 2));
        const distB = Math.sqrt(Math.pow(bLat - dcLat, 2) + Math.pow(bLon - dcLon, 2));
        return distA - distB;
      });
      
      // Limit to 10 vessels
      const limitedVessels = sortedVessels.slice(0, 10);
      
      setVessels(limitedVessels);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Error fetching vessel data:', err);
      setError('Failed to fetch vessel data from the server.');
      setLoading(false);
    }
  };

  // Fetch data on component mount and then poll
  useEffect(() => {
    fetchVessels();
    
    // Poll every 10 seconds
    const interval = setInterval(fetchVessels, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // Filter vessels based on the selected filter
  const filteredVessels = vessels.filter(vessel => {
    if (filter === 'all') return true;
    
    // Check vessel type if available
    const vesselType = (vessel.vessel_type || '').toLowerCase();
    return vesselType.includes(filter);
  });

  // Request detailed vessel report from AI agent
  const requestDetailedReport = async (vessel) => {
    try {
      setShowDetailedInfo(true);
      
      // Make API call to agent with specific vessel data
      const response = await fetch('http://localhost:5050/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Provide a detailed report on vessel ${vessel.mmsi} in the Eastern Seaboard context, including its relevance to Washington DC area maritime traffic and security.`
        })
      });
      
      const data = await response.json();
      
      // We would normally show this in a modal or panel, but for now we'll just log it
      console.log('Detailed Report:', data.reply);
      
      // TODO: Display the detailed report in a modal or panel
    } catch (error) {
      console.error('Error requesting detailed report:', error);
    }
  };

  return (
    <div className="eastern-seaboard-vessels">
      <div className="mb-3 flex justify-between items-center">
        <h2 className="text-xl font-bold text-blue-800">Eastern Seaboard Vessels</h2>
        
        <div className="flex items-center space-x-2">
          <label htmlFor="vessel-filter" className="text-sm text-textSecondary">
            Filter by type:
          </label>
          <select
            id="vessel-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="p-1 border border-border rounded-md bg-background text-text text-sm"
          >
            <option value="all">All Vessels</option>
            <option value="cargo">Cargo</option>
            <option value="tanker">Tanker</option>
            <option value="passenger">Passenger</option>
            <option value="fishing">Fishing</option>
            <option value="military">Military/Law Enforcement</option>
          </select>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <p className="text-textSecondary">
            Monitoring vessels along the Eastern Seaboard with special focus on those approaching the Washington DC area through the Chesapeake Bay and Potomac River. Sorted by proximity to DC.
          </p>
          
          {lastUpdated && (
            <div className="flex items-center text-xs text-textSecondary">
              <span className={loading ? 'flex items-center text-accentBlue' : ''}>
                {loading && (
                  <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                Last update: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accentBlue"></div>
        </div>
      ) : error ? (
        <div className="bg-alertRed bg-opacity-10 text-alertRed p-4 rounded-md">
          {error}
        </div>
      ) : (
        <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2">
          {filteredVessels.length === 0 ? (
            <p className="text-textSecondary text-center py-4">No vessels match the current filter.</p>
          ) : (
            filteredVessels.map(vessel => {
              // Get coordinates from either property name format
              const lat = vessel.lat || vessel.latitude || 0;
              const lon = vessel.lon || vessel.longitude || 0;
              const vesselName = vessel.vessel_name || vessel.name || `Unknown Vessel (${vessel.mmsi})`;
              const vesselType = vessel.vessel_type || vessel.type || 'Unknown';
              const vesselSpeed = vessel.speed !== undefined ? `${vessel.speed} knots` : 'Speed unknown';
              
              return (
                <div
                  key={vessel.mmsi}
                  className={`p-3 border rounded-md transition-colors cursor-pointer ${
                    selectedVessel?.mmsi === vessel.mmsi
                      ? 'border-accentBlue bg-accentBlue bg-opacity-5'
                      : 'border-border bg-background hover:bg-backgroundAlt'
                  }`}
                  onClick={() => setSelectedVessel(selectedVessel?.mmsi === vessel.mmsi ? null : vessel)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">
                        {vesselName}
                      </h3>
                      <p className="text-sm text-textSecondary">
                        MMSI: {vessel.mmsi} | Type: {vesselType}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {vesselSpeed}
                      </p>
                      <p className="text-xs text-textSecondary">
                        {lat.toFixed(4)}°, {lon.toFixed(4)}°
                      </p>
                    </div>
                  </div>
                  
                  {selectedVessel?.mmsi === vessel.mmsi && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
                        <div>
                          <p className="text-xs text-textSecondary">Course</p>
                          <p className="text-sm">{vessel.course !== undefined ? `${vessel.course}°` : 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-textSecondary">Destination</p>
                          <p className="text-sm">{vessel.destination || 'Not reported'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-textSecondary">Flag</p>
                          <p className="text-sm">{vessel.country || vessel.flag || 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-textSecondary">Status</p>
                          <p className="text-sm">{vessel.nav_status || vessel.status || 'Unknown'}</p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Add to tracked vessels
                            fetch('http://localhost:5050/api/vessels/track', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ mmsi: vessel.mmsi })
                            });
                          }}
                          className="text-sm text-accentBlue hover:text-blue-700"
                        >
                          Track Vessel
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDetailedReport(vessel);
                          }}
                          className="text-sm bg-accentBlue text-white px-3 py-1 rounded hover:bg-blue-700"
                        >
                          DC Area Analysis
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {showDetailedInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">
                Eastern Seaboard Vessel Analysis
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
              <p>Loading comprehensive vessel analysis from AI agent...</p>
              {/* This would be populated with the AI agent's detailed response */}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailedInfo(false)}
                className="px-4 py-2 bg-accentBlue text-white rounded hover:bg-blue-700"
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

export default EasternSeaboardVessels; 