const emailService = require('./services/email');

// Test email addresses
const TEST_USER_EMAIL = process.argv[2] || 'test@example.com';
const TEST_COAST_GUARD_EMAIL = process.argv[3] || '';

console.log(`Testing email service with: 
- User email: ${TEST_USER_EMAIL}
- Coast Guard email: ${TEST_COAST_GUARD_EMAIL || '(none provided)'}`);

// Set email addresses
emailService.setEmails(TEST_USER_EMAIL, TEST_COAST_GUARD_EMAIL);

// Send test email
async function runTest() {
  try {
    console.log('Sending test email...');
    const result = await emailService.sendTestEmail();
    
    if (result.success) {
      console.log('✅ Test email sent successfully!');
      console.log('Message ID:', result.messageId);
    } else {
      console.error('❌ Failed to send test email:', result.error);
    }
  } catch (error) {
    console.error('❌ Error sending test email:', error);
  }
}

// Run the test
runTest();

// Usage instructions
console.log('\nTo use this script:');
console.log('node email-test.js [user-email] [coast-guard-email]');
console.log('\nExample:');
console.log('node email-test.js user@example.com coastguard@example.gov'); 