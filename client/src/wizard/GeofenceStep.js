import React, { useRef } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Polygon, 
  FeatureGroup 
} from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { useGeofence } from './GeofenceContext';

// Fix for Leaflet icons in React
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const GeofenceStep = () => {
  const { geofence, setGeofence, isDefaultGeofence, resetGeofence } = useGeofence();
  const mapRef = useRef();
  
  // Center point for Washington DC area
  const center = [38.8895, -77.0353];
  
  // Handle geofence creation
  const handleCreated = (e) => {
    const { layer } = e;
    const latLngs = layer.getLatLngs()[0];
    
    // Convert to [lat, lng] array for our format
    const coordinates = latLngs.map(latLng => [latLng.lat, latLng.lng]);
    
    // Close the polygon
    coordinates.push([...coordinates[0]]);
    
    setGeofence(coordinates);
  };
  
  // Handle reset to default
  const handleReset = () => {
    resetGeofence();
    
    // Zoom to default location
    if (mapRef.current) {
      mapRef.current.setView(center, 10);
    }
  };
  
  return (
    <div>
      <h2 className="text-xl mb-4">Define Monitoring Geofence</h2>
      <p className="mb-6 text-textSecondary">
        Draw a polygon on the map to define the maritime area you want to monitor.
        You can also use the default geofence around the Washington DC area.
      </p>
      
      <div className="h-96 mb-6">
        <MapContainer 
          center={center} 
          zoom={10} 
          className="h-full w-full rounded-lg"
          whenCreated={mapInstance => { mapRef.current = mapInstance; }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Current Geofence */}
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
          
          {/* Editing controls */}
          <FeatureGroup>
            <EditControl
              position="topright"
              onCreated={handleCreated}
              draw={{
                rectangle: false,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
                polygon: {
                  allowIntersection: false,
                  drawError: {
                    color: '#FF6B6B',
                    message: 'Polygon cannot intersect itself'
                  },
                  shapeOptions: {
                    color: '#00E0D5',
                    fillOpacity: 0.1
                  }
                }
              }}
              edit={{
                edit: false, // Disable editing for MVP simplicity
                remove: false
              }}
            />
          </FeatureGroup>
        </MapContainer>
      </div>
      
      <button 
        className="btn-secondary"
        onClick={handleReset}
      >
        {isDefaultGeofence() ? 'Refresh Default Geofence' : 'Use Default Geofence'}
      </button>
    </div>
  );
};

export default GeofenceStep; 