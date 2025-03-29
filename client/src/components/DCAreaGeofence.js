import React, { useState, useEffect } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Polygon, 
  Marker, 
  Popup, 
  useMap 
} from 'react-leaflet';
import L from 'leaflet';
import { useGeofence } from '../wizard/GeofenceContext';

// Custom port icon
const portIcon = new L.DivIcon({
  className: 'port-marker',
  html: '<svg width="16" height="16" viewBox="0 0 100 100"><rect x="30" y="30" width="40" height="40" rx="5" ry="5" fill="currentColor" /></svg>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

// Component to recenter map when geofence changes
const MapController = ({ center, geofence }) => {
  const map = useMap();
  
  useEffect(() => {
    if (geofence && geofence.length > 2) {
      // Create bounds from the geofence points
      const bounds = L.polygon(geofence).getBounds();
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (center) {
      map.setView(center, 11);
    }
  }, [map, geofence, center]);
  
  return null;
};

const DCAreaGeofence = () => {
  const { geofence, setGeofence } = useGeofence();
  const [loading, setLoading] = useState(true);
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState(null);
  
  // Single DC area geofence preset
  const dcAreaGeofence = {
    name: 'DC Metropolitan Area',
    coordinates: [
      [38.8101, -77.0147], // Alexandria
      [38.9072, -77.0369], // DC downtown
      [38.9847, -76.9482], // College Park/Hyattsville
      [38.8402, -76.9323], // Oxon Hill
      [38.8101, -77.0147]  // Back to Alexandria to close
    ]
  };

  // Default center (Washington DC)
  const defaultCenter = [38.9072, -77.0369];
  
  // Calculate center of current geofence
  const center = geofence && geofence.length > 2
    ? geofence.reduce(
        (acc, coord) => [acc[0] + coord[0] / geofence.length, acc[1] + coord[1] / geofence.length],
        [0, 0]
      )
    : defaultCenter;

  // Fetch ports
  useEffect(() => {
    const fetchPorts = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5050/api/geofence/ports');
        const data = await response.json();
        setPorts(data.ports);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching port data:', err);
        setLoading(false);
      }
    };
    
    fetchPorts();
  }, []);

  // Apply DC area geofence
  const applyDCGeofence = async () => {
    try {
      // Update geofence context
      setGeofence(dcAreaGeofence.coordinates);
      
      // Save to backend
      await fetch('http://localhost:5050/api/geofence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ coordinates: dcAreaGeofence.coordinates })
      });
    } catch (error) {
      console.error('Error applying DC area geofence:', error);
    }
  };

  // Set the DC Area geofence on component mount if none exists
  useEffect(() => {
    if (!geofence || geofence.length < 3) {
      applyDCGeofence();
    }
  }, []);

  return (
    <div className="dc-area-geofence">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-blue-800">Washington DC Area Maritime Zone</h2>
        <p className="text-textSecondary mt-2">
          Monitor maritime activity in the DC Metropolitan area.
        </p>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">DC Area Geofence</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={applyDCGeofence}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            {dcAreaGeofence.name}
          </button>
        </div>
      </div>
      
      <div className="h-[500px] w-full relative border border-border rounded-lg overflow-hidden">
        <MapContainer 
          center={center} 
          zoom={10} 
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapController center={center} geofence={geofence} />
          
          {/* Current Geofence */}
          {geofence?.length > 2 && (
            <Polygon 
              positions={geofence} 
              pathOptions={{ 
                color: '#3B82F6', 
                fillColor: '#3B82F6',
                weight: 3,
                fillOpacity: 0.1,
                dashArray: '5, 5'
              }} 
            />
          )}
          
          {/* Port Markers */}
          {ports.map(port => (
            <Marker
              key={port.id}
              position={port.location}
              icon={portIcon}
              eventHandlers={{
                click: () => setSelectedPort(port),
              }}
            >
              <Popup>
                <div>
                  <h3 className="font-bold">{port.name}</h3>
                  <p className="text-sm">{port.details}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        
        {/* Overlay with active zone information */}
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 p-3 rounded-md border border-border max-w-[250px]">
          <p className="text-sm font-medium">
            Active Monitoring Zone
          </p>
          <p className="text-xs text-textSecondary">
            {geofence?.length > 2 
              ? `Polygon with ${geofence.length} points covering the DC area` 
              : 'No custom zone set - using default'}
          </p>
          <p className="text-xs mt-2">
            <span className="text-accentBlue">●</span> Port facilities
          </p>
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="p-4 border border-border rounded-md">
          <h3 className="text-sm font-medium mb-1">Current Geofence</h3>
          <p className="text-xs text-textSecondary">
            {geofence?.length > 2 
              ? `${geofence.length} point polygon` 
              : 'Default area'}
          </p>
        </div>
        <div className="p-4 border border-border rounded-md">
          <h3 className="text-sm font-medium mb-1">Ports in Zone</h3>
          <p className="text-xs text-textSecondary">
            {ports.length} key facilities
          </p>
        </div>
        <div className="p-4 border border-border rounded-md">
          <h3 className="text-sm font-medium mb-1">Zone Coverage</h3>
          <p className="text-xs text-textSecondary">
            Washington DC, Potomac River, Chesapeake Bay
          </p>
        </div>
      </div>
    </div>
  );
};

export default DCAreaGeofence; 