import React from 'react';
import { useGeofence } from './GeofenceContext';

const EmailStep = () => {
  const { userEmail, setUserEmail, coastGuardEmail, setCoastGuardEmail } = useGeofence();
  
  const handleUserEmailChange = (e) => {
    setUserEmail(e.target.value);
  };

  const handleCoastGuardEmailChange = (e) => {
    setCoastGuardEmail(e.target.value);
  };
  
  return (
    <div>
      <h2 className="text-xl mb-4">Alert Contact Information</h2>
      <p className="mb-6 text-textSecondary">
        Enter email addresses to receive alerts when anomalies are detected
        in the monitored maritime zone.
      </p>
      
      <div className="mb-6">
        <label htmlFor="userEmail" className="block text-sm font-medium mb-2">
          Your Email Address
        </label>
        <input
          id="userEmail"
          type="email"
          value={userEmail}
          onChange={handleUserEmailChange}
          placeholder="your.email@example.com"
          className="input w-full"
        />
        <p className="mt-2 text-sm text-textSecondary">
          You will receive alerts for detected maritime anomalies
        </p>
      </div>

      <div className="mb-6">
        <label htmlFor="coastGuardEmail" className="block text-sm font-medium mb-2">
          Coast Guard Email (Optional)
        </label>
        <input
          id="coastGuardEmail"
          type="email"
          value={coastGuardEmail}
          onChange={handleCoastGuardEmailChange}
          placeholder="coastguard@example.gov"
          className="input w-full"
        />
        <p className="mt-2 text-sm text-textSecondary">
          Alerts will also be sent to this Coast Guard contact
        </p>
      </div>
      
      <div className="p-4 bg-border bg-opacity-20 rounded-md mb-6">
        <h3 className="text-md font-semibold mb-2">MartinAI Alerts</h3>
        <p className="text-sm text-textSecondary">
          You will receive email alerts for:
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

export default EmailStep; 