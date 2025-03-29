// API utility functions for MartinAI maritime monitoring system

// Set a fixed base URL instead of relying on environment variables that might be causing issues
const API_BASE_URL = 'http://localhost:5050';

// Helper function to build API URLs consistently
const buildApiUrl = (endpoint) => {
  // Make sure endpoint starts with a slash
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  console.log(`API request: ${API_BASE_URL}${formattedEndpoint}`);
  return `${API_BASE_URL}${formattedEndpoint}`;
};

// Geofence API calls
export const fetchGeofence = async () => {
  try {
    const response = await fetch(buildApiUrl('/geofence'));
    console.log('Geofence fetch response status:', response.status);
    return await response.json();
  } catch (error) {
    console.error('Error fetching geofence:', error);
    throw error;
  }
};

export const saveGeofence = async (coordinates) => {
  try {
    const response = await fetch(buildApiUrl('/geofence'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ coordinates }),
    });
    console.log('Save geofence response status:', response.status);
    return await response.json();
  } catch (error) {
    console.error('Error saving geofence:', error);
    throw error;
  }
};

// Email alert settings
export const saveAlertEmails = async (userEmail, coastGuardEmail) => {
  try {
    console.log('Saving emails to:', buildApiUrl('/geofence/alert-emails'));
    const response = await fetch(buildApiUrl('/geofence/alert-emails'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userEmail, coastGuardEmail }),
    });
    
    console.log('Save emails response status:', response.status);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving alert emails:', error);
    throw error;
  }
};

export const fetchAlertEmails = async () => {
  try {
    const response = await fetch(buildApiUrl('/geofence/alert-emails'));
    
    console.log('Fetch emails response status:', response.status);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching alert emails:', error);
    throw error;
  }
};

export const sendTestEmail = async () => {
  try {
    console.log('Sending test email to:', buildApiUrl('/geofence/test-email'));
    const response = await fetch(buildApiUrl('/geofence/test-email'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Test email response status:', response.status);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending test email:', error);
    throw error;
  }
};

// Vessels API calls
export const fetchVessels = async () => {
  try {
    const response = await fetch(buildApiUrl('vessels'));
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching vessels:', error);
    throw error;
  }
};

export const fetchAnomalies = async () => {
  try {
    const response = await fetch(buildApiUrl('vessels/anomalies'));
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching anomalies:', error);
    throw error;
  }
};

// Other API calls can be added here as needed 