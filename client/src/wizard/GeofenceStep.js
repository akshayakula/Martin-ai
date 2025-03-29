import React, { useRef } from 'react';
import { 
  MapContainer, 
  TileLayer
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet icons in React
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const GeofenceStep = () => {
  const mapRef = useRef();
  
  // Center point for Washington DC area
  const center = [38.8895, -77.0353];
  
  return (
    <div>
      <h2 className="text-xl mb-4">Washington DC Area Map</h2>
      <p className="mb-6 text-textSecondary">
        Map of the Washington DC area.
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
        </MapContainer>
      </div>
    </div>
  );
};

export default GeofenceStep; 