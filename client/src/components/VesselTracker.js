import React, { useState, useEffect } from 'react';

const VesselTracker = () => {
  const [mmsi, setMMSI] = useState('');
  const [trackedVessel, setTrackedVessel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [trackedVessels, setTrackedVessels] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch all currently tracked vessels
  const fetchTrackedVessels = async () => {
    try {
      setIsUpdating(true);
      const response = await fetch('http://localhost:5050/api/vessels/track');
      const data = await response.json();
      
      if (data.success) {
        // Process vessels from new format - handle nested data structure
        const processedVessels = Object.entries(data.vessels || {}).map(([mmsi, vesselInfo]) => {
          // Access vessel data which may be nested within a data property
          const vesselData = vesselInfo.data || vesselInfo;
          
          return {
            mmsi: vesselData.mmsi || mmsi,
            vessel_name: vesselData.name,
            lat: vesselData.lat,
            lon: vesselData.lon,
            speed: vesselData.speed,
            course: vesselData.course,
            heading: vesselData.heading,
            destination: vesselData.destination,
            vessel_type: vesselData.type || vesselData.type_specific,
            country: vesselData.country_iso,
            navigation_status: vesselData.navigation_status,
            lastUpdated: vesselInfo.lastUpdated || new Date().toISOString()
          };
        });
        
        setTrackedVessels(processedVessels);
        setLastUpdated(new Date());
        
        // If we're currently viewing a vessel, update its data too
        if (trackedVessel) {
          const trackedResponse = await fetch(`http://localhost:5050/api/vessels/track/${trackedVessel.mmsi}`);
          const trackedData = await trackedResponse.json();
          if (trackedData.success) {
            // Process the individual vessel data
            const vesselInfo = trackedData.vessel;
            const vesselData = vesselInfo.data || vesselInfo;
            
            const processedVessel = {
              mmsi: vesselData.mmsi || trackedVessel.mmsi,
              vessel_name: vesselData.name,
              lat: vesselData.lat,
              lon: vesselData.lon,
              speed: vesselData.speed,
              course: vesselData.course,
              heading: vesselData.heading,
              destination: vesselData.destination,
              vessel_type: vesselData.type || vesselData.type_specific,
              country: vesselData.country_iso,
              navigation_status: vesselData.navigation_status,
              lastUpdated: vesselInfo.lastUpdated || new Date().toISOString()
            };
            
            setTrackedVessel(processedVessel);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching tracked vessels:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchTrackedVessels();
    
    // Poll tracked vessels every 10 seconds
    const interval = setInterval(fetchTrackedVessels, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!mmsi || mmsi.trim() === '') {
      setError('Please enter a valid MMSI number');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5050/api/vessels/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mmsi: mmsi.trim() })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Process the vessel data
        const vesselInfo = data.vessel;
        const vesselData = vesselInfo.data || vesselInfo;
        
        const processedVessel = {
          mmsi: vesselData.mmsi || mmsi.trim(),
          vessel_name: vesselData.name,
          lat: vesselData.lat,
          lon: vesselData.lon,
          speed: vesselData.speed,
          course: vesselData.course,
          heading: vesselData.heading,
          destination: vesselData.destination,
          vessel_type: vesselData.type || vesselData.type_specific,
          country: vesselData.country_iso,
          navigation_status: vesselData.navigation_status,
          lastUpdated: vesselInfo.lastUpdated || new Date().toISOString()
        };
        
        setTrackedVessel(processedVessel);
        // Refresh the list of tracked vessels
        fetchTrackedVessels();
        // Clear input
        setMMSI('');
      } else {
        setError(data.error || 'Failed to track vessel');
      }
    } catch (error) {
      console.error('Error tracking vessel:', error);
      setError('Failed to track vessel. Check the server connection.');
    } finally {
      setLoading(false);
    }
  };

  // Stop tracking a vessel
  const handleStopTracking = async (mmsiToStop) => {
    try {
      await fetch(`http://localhost:5050/api/vessels/track/${mmsiToStop}`, {
        method: 'DELETE'
      });
      
      // Refresh the list
      fetchTrackedVessels();
      
      // If we were viewing this vessel, clear it
      if (trackedVessel && trackedVessel.mmsi === mmsiToStop) {
        setTrackedVessel(null);
      }
    } catch (error) {
      console.error('Error stopping vessel tracking:', error);
    }
  };

  // View details of a tracked vessel
  const handleViewVessel = async (mmsiToView) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5050/api/vessels/track/${mmsiToView}`);
      const data = await response.json();
      
      if (data.success) {
        // Process the individual vessel data
        const vesselInfo = data.vessel;
        const vesselData = vesselInfo.data || vesselInfo;
        
        const processedVessel = {
          mmsi: vesselData.mmsi || mmsiToView,
          vessel_name: vesselData.name,
          lat: vesselData.lat,
          lon: vesselData.lon,
          speed: vesselData.speed,
          course: vesselData.course,
          heading: vesselData.heading,
          destination: vesselData.destination,
          vessel_type: vesselData.type || vesselData.type_specific,
          country: vesselData.country_iso,
          navigation_status: vesselData.navigation_status,
          lastUpdated: vesselInfo.lastUpdated || new Date().toISOString()
        };
        
        setTrackedVessel(processedVessel);
      }
    } catch (error) {
      console.error('Error viewing vessel details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vessel-tracker">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Live Vessel Tracking</h3>
          {isUpdating && (
            <span className="flex items-center text-xs text-accentBlue">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-accentBlue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Updating
            </span>
          )}
        </div>
        
        {lastUpdated && (
          <p className="text-xs text-textSecondary mb-2">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Enter MMSI number"
            value={mmsi}
            onChange={(e) => setMMSI(e.target.value)}
            className="flex-1 p-2 border border-border rounded-md bg-background text-text"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-accentBlue text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Tracking...' : 'Track'}
          </button>
        </form>
        {error && <p className="text-alertRed mt-2 text-sm">{error}</p>}
      </div>
      
      {/* List of tracked vessels */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Tracked Vessels</h3>
        {trackedVessels.length === 0 ? (
          <p className="text-textSecondary">No vessels currently being tracked.</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {trackedVessels.map((vessel) => (
              <div 
                key={vessel.mmsi} 
                className="p-2 border border-border rounded-md flex justify-between items-center bg-background hover:bg-backgroundAlt transition-colors cursor-pointer"
                onClick={() => handleViewVessel(vessel.mmsi)}
              >
                <div>
                  <p className="font-medium">{vessel.vessel_name || `Vessel ${vessel.mmsi}`}</p>
                  <p className="text-sm text-textSecondary">MMSI: {vessel.mmsi}</p>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStopTracking(vessel.mmsi);
                  }}
                  className="text-alertRed hover:text-red-700 p-1"
                  title="Stop tracking"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Detailed vessel information */}
      {trackedVessel && (
        <div className="border border-border rounded-md p-4 bg-background">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold">
              {trackedVessel.vessel_name || 'Unnamed Vessel'}
            </h3>
            <span className="text-xs bg-accentGreen bg-opacity-20 text-accentGreen px-2 py-1 rounded-full">
              Live Tracking
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-textSecondary mb-1">MMSI</p>
              <p className="font-medium">{trackedVessel.mmsi}</p>
            </div>
            {trackedVessel.imo && (
              <div>
                <p className="text-sm text-textSecondary mb-1">IMO</p>
                <p className="font-medium">{trackedVessel.imo}</p>
              </div>
            )}
            {trackedVessel.vessel_type && (
              <div>
                <p className="text-sm text-textSecondary mb-1">Vessel Type</p>
                <p className="font-medium">{trackedVessel.vessel_type}</p>
              </div>
            )}
            {trackedVessel.country && (
              <div>
                <p className="text-sm text-textSecondary mb-1">Flag</p>
                <p className="font-medium">{trackedVessel.country}</p>
              </div>
            )}
          </div>
          
          <hr className="my-4 border-border" />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-textSecondary mb-1">Latitude</p>
              <p className="font-medium">{trackedVessel.lat}</p>
            </div>
            <div>
              <p className="text-sm text-textSecondary mb-1">Longitude</p>
              <p className="font-medium">{trackedVessel.lon}</p>
            </div>
            <div>
              <p className="text-sm text-textSecondary mb-1">Speed</p>
              <p className="font-medium">{trackedVessel.speed || 0} knots</p>
            </div>
            <div>
              <p className="text-sm text-textSecondary mb-1">Course</p>
              <p className="font-medium">{trackedVessel.course || 0}°</p>
            </div>
            {trackedVessel.heading && (
              <div>
                <p className="text-sm text-textSecondary mb-1">Heading</p>
                <p className="font-medium">{trackedVessel.heading}°</p>
              </div>
            )}
            {trackedVessel.nav_status && (
              <div>
                <p className="text-sm text-textSecondary mb-1">Status</p>
                <p className="font-medium">{trackedVessel.nav_status}</p>
              </div>
            )}
          </div>
          
          {(trackedVessel.destination || trackedVessel.eta) && (
            <>
              <hr className="my-4 border-border" />
              <div className="grid grid-cols-2 gap-4">
                {trackedVessel.destination && (
                  <div>
                    <p className="text-sm text-textSecondary mb-1">Destination</p>
                    <p className="font-medium">{trackedVessel.destination}</p>
                  </div>
                )}
                {trackedVessel.eta && (
                  <div>
                    <p className="text-sm text-textSecondary mb-1">ETA</p>
                    <p className="font-medium">{trackedVessel.eta}</p>
                  </div>
                )}
              </div>
            </>
          )}
          
          <div className="mt-4 text-xs text-textSecondary">
            Last updated: {new Date(trackedVessel.lastUpdated).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default VesselTracker; 