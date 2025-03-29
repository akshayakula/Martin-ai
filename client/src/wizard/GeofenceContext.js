import React, { createContext, useState, useContext, useEffect } from 'react';

// Default geofence around Washington DC area
const defaultGeofence = [
  [38.7916, -77.1198],
  [38.9955, -77.0417],
  [38.9207, -76.9094],
  [38.7916, -77.1198]
];

// Create the context
const GeofenceContext = createContext();

export const useGeofence = () => useContext(GeofenceContext);

export const GeofenceProvider = ({ children }) => {
  // Initialize from localStorage or use default
  const [geofence, setGeofence] = useState(() => {
    const savedGeofence = localStorage.getItem('geofence');
    return savedGeofence ? JSON.parse(savedGeofence) : defaultGeofence;
  });
  
  // Initialize phone number from localStorage
  const [phoneNumber, setPhoneNumber] = useState(() => {
    return localStorage.getItem('phoneNumber') || '';
  });
  
  // Save to localStorage when values change
  useEffect(() => {
    localStorage.setItem('geofence', JSON.stringify(geofence));
  }, [geofence]);
  
  useEffect(() => {
    if (phoneNumber) {
      localStorage.setItem('phoneNumber', phoneNumber);
    }
  }, [phoneNumber]);
  
  // Check if using default geofence
  const isDefaultGeofence = () => {
    if (!geofence || geofence.length !== defaultGeofence.length) {
      return false;
    }
    
    // Check each coordinate pair
    return geofence.every((coord, index) => {
      return coord[0] === defaultGeofence[index][0] && 
             coord[1] === defaultGeofence[index][1];
    });
  };
  
  // Reset to default geofence
  const resetGeofence = () => {
    setGeofence(defaultGeofence);
  };
  
  return (
    <GeofenceContext.Provider value={{
      geofence,
      setGeofence,
      defaultGeofence,
      isDefaultGeofence,
      resetGeofence,
      phoneNumber,
      setPhoneNumber
    }}>
      {children}
    </GeofenceContext.Provider>
  );
}; 