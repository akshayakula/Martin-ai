import React, { useState } from 'react';
import GeofenceStep from './GeofenceStep';
import PhoneNumberStep from './PhoneNumberStep';
import { useGeofence } from './GeofenceContext';

// Step enum
const STEPS = {
  GEOFENCE: 0,
  PHONE: 1,
  COMPLETE: 2
};

const WizardFlow = ({ onSetupComplete }) => {
  // Current step in the wizard
  const [currentStep, setCurrentStep] = useState(STEPS.GEOFENCE);
  const { geofence, phoneNumber } = useGeofence();
  
  // Handle next step
  const handleNext = () => {
    if (currentStep < STEPS.COMPLETE) {
      setCurrentStep(currentStep + 1);
    }
    
    if (currentStep === STEPS.PHONE) {
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
  
  // Determine if next button should be enabled
  const isNextEnabled = () => {
    switch (currentStep) {
      case STEPS.GEOFENCE:
        return geofence && geofence.length >= 3;
      case STEPS.PHONE:
        return phoneNumber && phoneNumber.length >= 10;
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
              currentStep >= STEPS.PHONE ? 'bg-accentCyan' : 'bg-border'
            }`}>
              2
            </div>
            <span className="mt-2 text-sm">Contact</span>
          </div>
        </div>
      </div>
      
      {/* Step content */}
      <div className="mb-8">
        {currentStep === STEPS.GEOFENCE && <GeofenceStep />}
        {currentStep === STEPS.PHONE && <PhoneNumberStep />}
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
          {currentStep === STEPS.PHONE ? 'Complete Setup' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default WizardFlow; 