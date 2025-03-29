import React, { useState, useEffect } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Polygon, 
  Marker, 
  Popup 
} from 'react-leaflet';
import L from 'leaflet';
import { useGeofence } from '../wizard/GeofenceContext';
import ChatPanel from '../components/ChatPanel';
import VesselTracker from '../components/VesselTracker';
import EasternSeaboardVessels from '../components/EasternSeaboardVessels';
import DCAreaPorts from '../components/DCAreaPorts';
import DCAreaGeofence from '../components/DCAreaGeofence';
import MockScenarios from '../components/MockScenarios';

// Custom vessel icon
const vesselIcon = new L.DivIcon({
  className: 'vessel-marker',
  html: '<svg width="12" height="12" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /></svg>',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

// Custom AIS shutoff icon
const shutoffIcon = new L.DivIcon({
  className: 'ais-shutdown-marker',
  html: '<svg width="14" height="14" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" /></svg>',
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const Dashboard = () => {
  const { geofence, userEmail } = useGeofence();
  const [vessels, setVessels] = useState([]);
  const [anomalies, setAnomalies] = useState({ routeDeviations: [], aisShutoffs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // Default to overview tab
  
  // Default center for Washington DC area
  const defaultCenter = [38.9072, -77.0369];
  
  // Center on the middle of the geofence, with fallback to default center
  const center = geofence && geofence.length > 0
    ? geofence.reduce(
        (acc, coord) => [acc[0] + coord[0] / geofence.length, acc[1] + coord[1] / geofence.length],
        [0, 0]
      )
    : defaultCenter;

  // Fetch vessel data
  const fetchVesselData = async () => {
    try {
      setLoading(true);
      
      // Call the actual API endpoint
      const response = await fetch('http://localhost:5050/api/vessels');
      const data = await response.json();
      
      // Add safeguards - filter out vessels with invalid coordinates and limit to 10
      const validVessels = data.vessels
        .filter(vessel => vessel.lat != null && vessel.lon != null && 
                         !isNaN(vessel.lat) && !isNaN(vessel.lon))
        .slice(0, 10); // Limit to 10 vessels
      
      setVessels(validVessels);
      
      // Fetch anomalies data
      const anomaliesResponse = await fetch('http://localhost:5050/api/vessels/anomalies');
      const anomaliesData = await anomaliesResponse.json();
      
      // Filter anomalies with valid coordinates
      const validAnomalies = {
        routeDeviations: anomaliesData.anomalies.routeDeviations
          .filter(vessel => vessel.lat != null && vessel.lon != null && 
                           !isNaN(vessel.lat) && !isNaN(vessel.lon)),
        aisShutoffs: anomaliesData.anomalies.aisShutoffs
          .filter(vessel => vessel.lat != null && vessel.lon != null && 
                           !isNaN(vessel.lat) && !isNaN(vessel.lon))
      };
      
      setAnomalies(validAnomalies);
      setLastUpdate(data.lastUpdated);
      setError(null);
    } catch (err) {
      console.error('Error fetching vessel data:', err);
      setError('Failed to fetch vessel data');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch data on component mount and set up polling
  useEffect(() => {
    fetchVesselData();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchVesselData, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Panel - Map and Stats */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {/* Tab Navigation */}
        <div className="flex border-b border-border overflow-x-auto whitespace-nowrap">
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'overview' ? 'text-accentBlue border-b-2 border-accentBlue' : 'text-textSecondary hover:text-text'}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'eastern-seaboard' ? 'text-accentBlue border-b-2 border-accentBlue' : 'text-textSecondary hover:text-text'}`}
            onClick={() => setActiveTab('eastern-seaboard')}
          >
            Eastern Seaboard
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'dc-area-ports' ? 'text-accentBlue border-b-2 border-accentBlue' : 'text-textSecondary hover:text-text'}`}
            onClick={() => setActiveTab('dc-area-ports')}
          >
            DC Area Ports
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'dc-area-geofence' ? 'text-accentBlue border-b-2 border-accentBlue' : 'text-textSecondary hover:text-text'}`}
            onClick={() => setActiveTab('dc-area-geofence')}
          >
            DC Geofences
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'vessel-tracker' ? 'text-accentBlue border-b-2 border-accentBlue' : 'text-textSecondary hover:text-text'}`}
            onClick={() => setActiveTab('vessel-tracker')}
          >
            Vessel Tracker
          </button>
        </div>
        
        {/* Tab Content */}
        {activeTab === 'overview' ? (
          // Overview Tab
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Washington DC Area Maritime Monitoring</h2>
            
            <div className="h-[500px] relative">
              <MapContainer 
                center={center} 
                zoom={11} 
                className="h-full w-full rounded-lg"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Geofence Polygon */}
                {geofence?.length > 2 && (
                  <Polygon 
                    positions={geofence} 
                    pathOptions={{ 
                      color: '#00E0D5', 
                      fillColor: '#00E0D5',
                      weight: 2,
                      fillOpacity: 0.1 
                    }} 
                  />
                )}
                
                {/* Vessel Markers */}
                {vessels.map(vessel => (
                  vessel.lat != null && vessel.lon != null && !isNaN(vessel.lat) && !isNaN(vessel.lon) ? (
                    <Marker
                      key={vessel.mmsi}
                      position={[vessel.lat, vessel.lon]}
                      icon={vesselIcon}
                    >
                      <Popup>
                        <div>
                          <h3 className="font-bold">Vessel {vessel.mmsi}</h3>
                          <p>Speed: {vessel.speed} knots</p>
                          <p>Course: {vessel.course}°</p>
                          <p>Destination: {vessel.destination || 'Unknown'}</p>
                          {anomalies.routeDeviations.find(d => d.mmsi === vessel.mmsi) && (
                            <p className="text-alertRed font-bold mt-2">
                              Route deviation detected
                            </p>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ) : null
                ))}
                
                {/* AIS Shutoff Markers */}
                {anomalies.aisShutoffs.map(vessel => (
                  vessel.lat != null && vessel.lon != null && !isNaN(vessel.lat) && !isNaN(vessel.lon) ? (
                    <Marker
                      key={vessel.mmsi}
                      position={[vessel.lat, vessel.lon]}
                      icon={shutoffIcon}
                    >
                      <Popup>
                        <div>
                          <h3 className="font-bold">AIS Signal Loss</h3>
                          <p>Vessel {vessel.mmsi}</p>
                          <p>Last seen: {new Date(vessel.lastSeen).toLocaleTimeString()}</p>
                          <p className="text-alertRed font-bold mt-2">
                            Signal lost
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  ) : null
                ))}
              </MapContainer>
              
              {/* Status Overlay */}
              <div className="absolute bottom-4 left-4 bg-card bg-opacity-90 p-3 rounded-md border border-border">
                <p className="text-sm">
                  <span className="font-medium">Status:</span>{' '}
                  {loading ? 'Updating...' : 'Active'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Vessels in zone:</span>{' '}
                  {vessels.length}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Anomalies:</span>{' '}
                  {anomalies.routeDeviations.length + anomalies.aisShutoffs.length}
                </p>
                <p className="text-xs text-textSecondary mt-1">
                  Last update: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '-'}
                </p>
              </div>
            </div>
            
            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-border bg-opacity-20 p-4 rounded-md">
                <h3 className="text-sm text-textSecondary mb-1">Vessels Monitored</h3>
                <p className="text-2xl font-bold">{vessels.length}</p>
              </div>
              <div className="bg-border bg-opacity-20 p-4 rounded-md">
                <h3 className="text-sm text-textSecondary mb-1">Route Deviations</h3>
                <p className="text-2xl font-bold text-accentPurple">{anomalies.routeDeviations.length}</p>
              </div>
              <div className="bg-border bg-opacity-20 p-4 rounded-md">
                <h3 className="text-sm text-textSecondary mb-1">AIS Shutoffs</h3>
                <p className="text-2xl font-bold text-alertRed">{anomalies.aisShutoffs.length}</p>
              </div>
            </div>
          </div>
        ) : activeTab === 'eastern-seaboard' ? (
          // Eastern Seaboard Vessels Tab
          <div className="card">
            <EasternSeaboardVessels />
          </div>
        ) : activeTab === 'dc-area-ports' ? (
          // DC Area Ports Tab  
          <div className="card">
            <DCAreaPorts />
          </div>
        ) : activeTab === 'dc-area-geofence' ? (
          // DC Area Geofence Tab
          <div className="card">
            <DCAreaGeofence />
          </div>
        ) : (
          // Vessel Tracker Tab
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Detailed Vessel Tracking</h2>
            <VesselTracker />
          </div>
        )}
      </div>
      
      {/* Right Panel - Chat and Controls */}
      <div className="flex flex-col gap-6">
        {/* Maritime Safety Officer Controls */}
        <div className="card">
          <MockScenarios />
        </div>
        
        {/* AI Agent Chat */}
        <div className="card flex-1">
          <ChatPanel />
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 