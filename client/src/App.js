import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WizardFlow from './wizard/WizardFlow';
import Dashboard from './pages/Dashboard';
import Header from './components/Header';
import { GeofenceProvider } from './wizard/GeofenceContext';

function App() {
  // Check if setup is complete
  const [setupComplete, setSetupComplete] = useState(
    localStorage.getItem('setupComplete') === 'true'
  );

  // Handler for when setup is completed
  const handleSetupComplete = () => {
    localStorage.setItem('setupComplete', 'true');
    setSetupComplete(true);
  };

  // Reset the setup wizard by clearing localStorage
  const resetSetup = () => {
    localStorage.removeItem('geofence');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('coastGuardEmail');
    setSetupComplete(false);
  };

  return (
    <Router>
      <GeofenceProvider>
        <div className="min-h-screen flex flex-col bg-background text-text">
          <Header onResetSetup={resetSetup} />
          <main className="flex-grow container mx-auto px-4 py-6">
            <Routes>
              <Route 
                path="/" 
                element={setupComplete ? <Navigate to="/dashboard" /> : <WizardFlow onSetupComplete={handleSetupComplete} />}
              />
              <Route 
                path="/dashboard" 
                element={setupComplete ? <Dashboard /> : <Navigate to="/" />}
              />
              <Route path="/setup" element={<WizardFlow onSetupComplete={handleSetupComplete} />} />
            </Routes>
          </main>
          <footer className="text-center py-4 text-textSecondary text-sm">
            MartinAI - Maritime AIS Threat Detection System
          </footer>
        </div>
      </GeofenceProvider>
    </Router>
  );
}

export default App;
