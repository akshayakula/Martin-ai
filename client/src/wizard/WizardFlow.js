import React, { useState } from 'react';
import GeofenceStep from './GeofenceStep';
import EmailStep from './EmailStep';
import { useGeofence } from './GeofenceContext';

// Step enum
const STEPS = {
  GEOFENCE: 0,
  EMAIL: 1,
  COMPLETE: 2
};

const WizardFlow = ({ onSetupComplete }) => {
  // Current step in the wizard
  const [currentStep, setCurrentStep] = useState(STEPS.GEOFENCE);
  const { geofence, userEmail, coastGuardEmail } = useGeofence();
  
  // Handle next step
  const handleNext = () => {
    if (currentStep < STEPS.COMPLETE) {
      setCurrentStep(currentStep + 1);
    }
    
    if (currentStep === STEPS.EMAIL) {
      // Wizard is complete
      onSetupComplete();
    }
  };
  
  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > STEPS.GEOFENCE) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Validate email format
  const isValidEmail = (email) => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Determine if next button should be enabled
  const isNextEnabled = () => {
    switch (currentStep) {
      case STEPS.GEOFENCE:
        return geofence && geofence.length >= 3;
      case STEPS.EMAIL:
        // At least one valid email (user or coast guard) is required
        return isValidEmail(userEmail) || isValidEmail(coastGuardEmail);
      default:
        return false;
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto card">
      <h1 className="text-2xl font-bold mb-6">Setup MartinAI</h1>
      
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 flex items-center justify-center rounded-full ${
              currentStep >= STEPS.GEOFENCE ? 'bg-accentCyan' : 'bg-border'
            }`}>
              1
            </div>
            <span className="mt-2 text-sm">Geofence</span>
          </div>
          
          <div className={`h-1 flex-grow mx-2 ${
            currentStep > STEPS.GEOFENCE ? 'bg-accentCyan' : 'bg-border'
          }`} />
          
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 flex items-center justify-center rounded-full ${
              currentStep >= STEPS.EMAIL ? 'bg-accentCyan' : 'bg-border'
            }`}>
              2
            </div>
            <span className="mt-2 text-sm">Email Alerts</span>
          </div>
        </div>
      </div>
      
      {/* Step content */}
      <div className="mb-8">
        {currentStep === STEPS.GEOFENCE && <GeofenceStep />}
        {currentStep === STEPS.EMAIL && <EmailStep />}
      </div>
      
      {/* Navigation buttons */}
      <div className="flex justify-between">
        {currentStep > STEPS.GEOFENCE ? (
          <button 
            className="btn-secondary"
            onClick={handlePrevious}
          >
            Previous
          </button>
        ) : (
          <div></div> // Empty div for spacing
        )}
        
        <button 
          className="btn-primary"
          onClick={handleNext}
          disabled={!isNextEnabled()}
        >
          {currentStep === STEPS.EMAIL ? 'Complete Setup' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default WizardFlow; 