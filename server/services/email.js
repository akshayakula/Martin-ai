const nodemailer = require('nodemailer');
require('dotenv').config();

// Create a transporter with Gmail credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD
  }
});

// Store email addresses
let userEmail = null;
let coastGuardEmail = null;

// Send alert email
const sendAlertEmail = async (subject, message) => {
  try {
    // If no emails are set, log and return
    if (!userEmail && !coastGuardEmail) {
      console.log('No email addresses configured for alerts');
      return { success: false, error: 'No email addresses configured' };
    }

    // Prepare recipients list
    const recipients = [];
    if (userEmail) recipients.push(userEmail);
    if (coastGuardEmail) recipients.push(coastGuardEmail);

    // Send email
    const info = await transporter.sendMail({
      from: `"MartinAI Maritime Alert" <${process.env.GMAIL_USER}>`,
      to: recipients.join(', '),
      subject: `MartinAI Alert: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #3366cc; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">Maritime Alert Notification</h2>
          <p style="color: #d32f2f; font-weight: bold;">ALERT TYPE: ${subject}</p>
          <div style="margin: 20px 0;">
            ${message}
          </div>
          <div style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; margin-top: 20px;">
            <p style="margin: 0; font-size: 12px; color: #666;">This is an automated alert from the MartinAI Maritime Monitoring System.</p>
          </div>
        </div>
      `
    });

    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Set email addresses
const setEmails = (user, coastGuard) => {
  if (user) userEmail = user;
  if (coastGuard) coastGuardEmail = coastGuard;
  return { userEmail, coastGuardEmail };
};

// Get email addresses
const getEmails = () => {
  return { userEmail, coastGuardEmail };
};

// Send test email
const sendTestEmail = async () => {
  return await sendAlertEmail(
    'Test Notification',
    `
    <p>This is a test alert from MartinAI Maritime Monitoring System.</p>
    <p>If you received this message, your alert notifications are configured correctly.</p>
    `
  );
};

module.exports = {
  sendAlertEmail,
  setEmails,
  getEmails,
  sendTestEmail
}; 