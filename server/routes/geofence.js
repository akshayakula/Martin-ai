const express = require('express');
const router = express.Router();
const anomalyService = require('../services/anomaly');
const emailService = require('../services/email');

// Default geofence - massively expanded to cover eastern shore
const defaultGeofence = [
  [38.7861, -77.1170], // Southwest - Mount Vernon area
  [38.9967, -77.1452], // Northwest - Bethesda area
  [39.2847, -76.6095], // Northeast - Baltimore harbor area
  [38.9784, -76.4430], // East - Annapolis/Chesapeake Bay
  [38.8098, -76.9625], // Southeast - National Harbor area
  [38.7861, -77.1170]  // Close the polygon - Mount Vernon area
];

// DC area key port locations for map display
const dcAreaPorts = [
  { id: 'port_1', name: 'Port of Baltimore', location: [39.2604, -76.5975], details: 'Major mid-Atlantic port handling over 30 million tons of cargo annually' },
  { id: 'port_2', name: 'Alexandria Terminal', location: [38.8101, -77.0147], details: 'Serving the DC area with container and break-bulk facilities' },
  { id: 'port_3', name: 'Washington Navy Yard', location: [38.8751, -76.9951], details: 'Historic naval facility on the Anacostia River' },
  { id: 'port_4', name: 'Port of Washington', location: [38.8733, -77.0197], details: 'Key facility serving the nation\'s capital' },
  { id: 'port_5', name: 'Buzzard Point', location: [38.8653, -77.0172], details: 'Former industrial marine terminal in Southwest DC' }
];

// Get current geofence
router.get('/', (req, res) => {
  const geofence = anomalyService.getGeofence();
  
  if (!geofence) {
    // Return default if no geofence set
    return res.json({ 
      geofence: defaultGeofence,
      isDefault: true
    });
  }
  
  res.json({ 
    geofence: geofence.geometry.coordinates[0],
    isDefault: false
  });
});

// Get DC area ports
router.get('/ports', (req, res) => {
  res.json({
    ports: dcAreaPorts,
    count: dcAreaPorts.length,
    lastUpdated: new Date().toISOString()
  });
});

// Set new geofence
router.post('/', (req, res) => {
  const { coordinates } = req.body;
  
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
    return res.status(400).json({ 
      error: 'Invalid geofence coordinates. Must be an array of [lat, lon] points, minimum 3 points.' 
    });
  }
  
  const result = anomalyService.setGeofence(coordinates);
  
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  
  res.status(201).json({ 
    message: 'Geofence set successfully',
    geofence: coordinates
  });
});

// Set alert emails
router.post('/alert-emails', (req, res) => {
  console.log('POST /alert-emails received with body:', req.body);
  const { userEmail, coastGuardEmail } = req.body;
  
  // Validate at least one email is provided
  if (!userEmail && !coastGuardEmail) {
    console.log('No email provided in request');
    return res.status(400).json({ error: 'At least one email address is required' });
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (userEmail && !emailRegex.test(userEmail)) {
    console.log('Invalid user email format:', userEmail);
    return res.status(400).json({ error: 'Invalid user email address format' });
  }
  
  if (coastGuardEmail && !emailRegex.test(coastGuardEmail)) {
    console.log('Invalid coast guard email format:', coastGuardEmail);
    return res.status(400).json({ error: 'Invalid coast guard email address format' });
  }
  
  // Set emails in the email service
  const result = emailService.setEmails(userEmail, coastGuardEmail);
  console.log('Emails set successfully:', result);
  
  res.status(200).json({ 
    message: 'Alert email addresses set successfully',
    emails: result
  });
});

// Get alert emails
router.get('/alert-emails', (req, res) => {
  console.log('GET /alert-emails request received');
  const emails = emailService.getEmails();
  console.log('Returning emails:', emails);
  res.json(emails);
});

// Send test email
router.post('/test-email', async (req, res) => {
  console.log('POST /test-email received');
  try {
    const result = await emailService.sendTestEmail();
    console.log('Test email result:', result);
    
    if (!result.success) {
      console.log('Failed to send test email:', result.error);
      return res.status(400).json({ 
        error: 'Failed to send test email', 
        details: result.error 
      });
    }
    
    console.log('Test email sent successfully');
    res.status(200).json({ 
      message: 'Test email sent successfully',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Error in test-email endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error sending test email',
      details: error.message 
    });
  }
});

module.exports = router;

