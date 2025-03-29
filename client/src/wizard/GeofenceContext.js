import React, { createContext, useState, useContext, useEffect } from 'react';

// Default geofence - massively expanded to cover eastern shore
const defaultGeofence = [
  [37.5000, -78.5000], // Southwest point - far inland Virginia
  [40.5000, -77.5000], // Northwest point - central Pennsylvania 
  [40.5000, -74.5000], // Northeast point - New Jersey coast
  [37.0000, -75.0000], // Southeast point - Virginia Beach/Norfolk
  [37.5000, -78.5000]  // Close the polygon
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