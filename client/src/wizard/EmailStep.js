import React, { useState, useEffect } from 'react';
import { useGeofence } from './GeofenceContext';
import { saveAlertEmails, sendTestEmail } from '../api';

const EmailStep = () => {
  const { userEmail, setUserEmail, coastGuardEmail, setCoastGuardEmail } = useGeofence();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState(null);
  
  // Save emails to server when they change
  useEffect(() => {
    // Only save if we have at least one email
    if (userEmail || coastGuardEmail) {
      saveEmails(userEmail, coastGuardEmail);
    }
  }, [userEmail, coastGuardEmail]);
  
  const handleUserEmailChange = (e) => {
    setUserEmail(e.target.value);
    setSaveSuccess(false);
  };

  const handleCoastGuardEmailChange = (e) => {
    setCoastGuardEmail(e.target.value);
    setSaveSuccess(false);
  };
  
  const saveEmails = async (userEmail, coastGuardEmail) => {
    try {
      setIsSaving(true);
      setSaveError(null);
      
      await saveAlertEmails(userEmail, coastGuardEmail);
      setSaveSuccess(true);
    } catch (error) {
      console.error('Error saving email addresses:', error);
      setSaveError('Failed to save email addresses. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleTestEmail = async () => {
    if (!userEmail && !coastGuardEmail) {
      setTestEmailStatus({
        success: false,
        message: 'Please enter at least one email address'
      });
      return;
    }
    
    try {
      setTestEmailStatus({ loading: true });
      
      // First, always ensure we have the latest emails saved
      console.log("Saving emails before test:", userEmail, coastGuardEmail);
      await saveEmails(userEmail, coastGuardEmail);
      
      // Small delay to ensure the save completes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Now send the test
      console.log("Sending test email");
      const response = await sendTestEmail();
      console.log("Test email response:", response);
      
      setTestEmailStatus({
        success: true,
        message: 'Test email sent successfully. Please check your inbox.'
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      setTestEmailStatus({
        success: false,
        message: `Failed to send test email: ${error.message}`
      });
    }
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
          Maritime Safety Officer Email
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
          As the Maritime Safety Officer, you will receive all alerts for detected anomalies
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
      
      {/* Status messages */}
      {saveError && (
        <div className="p-3 mb-4 bg-alertRed bg-opacity-10 text-alertRed rounded-md">
          {saveError}
        </div>
      )}
      
      {saveSuccess && (
        <div className="p-3 mb-4 bg-green-100 text-green-700 rounded-md">
          Email addresses saved successfully
        </div>
      )}
      
      {/* Test Email Button */}
      <div className="mb-6">
        <button 
          onClick={handleTestEmail} 
          className="btn-secondary w-full"
          disabled={isSaving || (!userEmail && !coastGuardEmail)}
        >
          {testEmailStatus?.loading ? 'Sending...' : 'Send Test Email'}
        </button>
        
        {testEmailStatus && !testEmailStatus.loading && (
          <div className={`p-3 mt-2 rounded-md ${testEmailStatus.success 
            ? 'bg-green-100 text-green-700' 
            : 'bg-alertRed bg-opacity-10 text-alertRed'}`}>
            {testEmailStatus.message}
          </div>
        )}
      </div>
      
      <div className="p-4 bg-border bg-opacity-20 rounded-md mb-6">
        <h3 className="text-md font-semibold mb-2">MartinAI Alerts</h3>
        <p className="text-sm text-textSecondary">
          Maritime Safety Officers will receive email alerts for:
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