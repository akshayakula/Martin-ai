import React, { useState } from 'react';

const MockScenarios = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const triggerMockScenario = async (scenario) => {
    setLoading(true);
    setMessage(null);
    
    try {
      // Select a mock vessel to use for the alert
      const mockVessel = {
        mmsi: "366998510", // Example vessel MMSI
        vessel_name: "MOCK TEST VESSEL",
        lat: 38.8895,
        lon: -77.0353,
        speed: 12.5,
        course: 180,
        vessel_type: "Cargo",
        destination: "Washington DC"
      };
      
      // API endpoint and parameters depend on scenario type
      let endpoint = 'http://localhost:5050/api/vessels/test-alert/366998510';
      let alertType = 'unknown';
      let recipient = 'user'; // Default to user email (Maritime Safety Officer)
      
      switch(scenario) {
        case 'aisShutoff':
          alertType = 'aisShutoff';
          break;
        case 'routeDeviation':
          alertType = 'routeDeviation';
          break;
        case 'coastGuard':
          alertType = 'coastGuard';
          recipient = 'coastGuard';
          break;
        default:
          alertType = 'unknown';
      }
      
      // Trigger the mock scenario
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          alertType,
          recipient
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({
          type: 'success',
          text: `${scenario} scenario triggered successfully. Check email for alerts.`
        });
      } else {
        setMessage({
          type: 'error',
          text: `Failed to trigger ${scenario} scenario: ${data.error || 'Unknown error'}`
        });
      }
    } catch (error) {
      console.error('Error triggering mock scenario:', error);
      setMessage({
        type: 'error',
        text: `Error: ${error.message || 'Failed to connect to server'}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4">Maritime Safety Officer Controls</h2>
      <p className="mb-4 text-textSecondary">
        Use these controls to simulate various maritime scenarios for testing and training purposes.
      </p>
      
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={() => triggerMockScenario('aisShutoff')}
          disabled={loading}
          className="bg-alertRed hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
        >
          MOCK AIS Shutoff
        </button>
        
        <button
          onClick={() => triggerMockScenario('routeDeviation')}
          disabled={loading}
          className="bg-accentPurple hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
        >
          MOCK Ship Diversion
        </button>
        
        <button
          onClick={() => triggerMockScenario('coastGuard')}
          disabled={loading}
          className="bg-accentBlue hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
        >
          MOCK Coast Guard Notification
        </button>
      </div>
      
      {loading && (
        <div className="text-textSecondary flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accentBlue mr-2"></div>
          <span>Processing...</span>
        </div>
      )}
      
      {message && (
        <div className={`mt-2 p-3 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:bg-opacity-20 dark:text-green-400' 
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:bg-opacity-20 dark:text-red-400'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default MockScenarios; 