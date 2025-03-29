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
  const { geofence, phoneNumber } = useGeofence();
  const [vessels, setVessels] = useState([]);
  const [anomalies, setAnomalies] = useState({ routeDeviations: [], aisShutoffs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Center on the middle of the geofence
  const center = geofence.reduce(
    (acc, coord) => [acc[0] + coord[0] / geofence.length, acc[1] + coord[1] / geofence.length],
    [0, 0]
  );

  // Fetch vessel data
  const fetchVesselData = async () => {
    try {
      setLoading(true);
      
      // For the MVP, we'll use mock data
      // In a real application, this would be:
      // const response = await fetch('http://localhost:5000/api/vessels');
      // const data = await response.json();
      
      // Mock data for demonstration
      const mockData = {
        vessels: [
          { mmsi: '123456789', lat: 38.89, lon: -77.03, speed: 7.5, course: 120, destination: 'PORT WASHINGTON' },
          { mmsi: '987654321', lat: 38.85, lon: -77.01, speed: 0, course: 0, destination: 'ALEXANDRIA' },
          { mmsi: '567891234', lat: 38.92, lon: -77.05, speed: 12, course: 260, destination: 'NAVAL YARD' }
        ],
        anomalies: {
          routeDeviations: [
            { 
              mmsi: '123456789', 
              lat: 38.89, 
              lon: -77.03, 
              deviationInfo: { 
                distanceNm: 3.4, 
                hasDeviated: true 
              } 
            }
          ],
          aisShutoffs: [
            { 
              mmsi: '456123789', 
              lat: 38.88, 
              lon: -77.04, 
              lastSeen: Date.now() - 1000 * 60 * 15 // 15 minutes ago
            }
          ]
        },
        lastUpdated: new Date().toISOString()
      };
      
      setVessels(mockData.vessels);
      setAnomalies(mockData.anomalies);
      setLastUpdate(mockData.lastUpdated);
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
      {/* Map Panel */}
      <div className="lg:col-span-2 card">
        <h2 className="text-xl font-bold mb-4">Maritime Monitoring</h2>
        
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
            ))}
            
            {/* AIS Shutoff Markers */}
            {anomalies.aisShutoffs.map(vessel => (
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
      
      {/* Chat Panel */}
      <div className="card h-[600px] flex flex-col">
        <h2 className="text-xl font-bold mb-4">AI Agent Interface</h2>
        <ChatPanel />
      </div>
    </div>
  );
};

export default Dashboard; 