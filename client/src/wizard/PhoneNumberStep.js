import React from 'react';
import { useGeofence } from './GeofenceContext';

const PhoneNumberStep = () => {
  const { phoneNumber, setPhoneNumber } = useGeofence();
  
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    
    // Allow only numbers and a few formatting characters
    if (/^[0-9+\-\s()]*$/.test(value)) {
      setPhoneNumber(value);
    }
  };
  
  return (
    <div>
      <h2 className="text-xl mb-4">Alert Contact Information</h2>
      <p className="mb-6 text-textSecondary">
        Enter your phone number to receive alerts when anomalies are detected
        in the monitored maritime zone.
      </p>
      
      <div className="mb-6">
        <label htmlFor="phoneNumber" className="block text-sm font-medium mb-2">
          Phone Number
        </label>
        <input
          id="phoneNumber"
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder="+1 (202) 555-0123"
          className="input w-full"
        />
        <p className="mt-2 text-sm text-textSecondary">
          Enter a valid phone number including country code
        </p>
      </div>
      
      <div className="p-4 bg-border bg-opacity-20 rounded-md mb-6">
        <h3 className="text-md font-semibold mb-2">MartinAI Alerts</h3>
        <p className="text-sm text-textSecondary">
          You will receive SMS alerts for:
        </p>
        <ul className="text-sm text-textSecondary mt-2 list-disc pl-5">
          <li>AIS signal shutoff within geofence</li>
          <li>Significant vessel route deviations</li>
          <li>New vessels entering the monitored zone</li>
        </ul>
      </div>
    </div>
  );
};

export default PhoneNumberStep; 