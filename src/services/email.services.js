import nodemailer from 'nodemailer';

// Configure the SMTP transport using environment variables
// For Gmail, use host 'smtp.gmail.com' and port 465 (secure) or 587 (TLS)
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can explicitly specify 'gmail'
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS // Use an App Password, not your regular Gmail password
  }
});

/**
 * Send an email notifying the user that their password was changed.
 * @param {string} toEmail 
 * @param {string} userName 
 */
export async function sendPasswordChangeEmail(toEmail, userName) {
  try {
    const mailOptions = {
      from: `"Attendance Calculator" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Security Alert: Your Password Has Been Changed',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #e74c3c;">Password Change Notification</h2>
          <p>Hi ${userName},</p>
          <p>This is a confirmation that the password for your Attendance Calculator account was just changed.</p>
          <p>If you made this change, you can safely ignore this email.</p>
          <p><strong>If you did not make this change</strong>, please contact support or reset your password immediately.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="font-size: 12px; color: #888;">
            You received this email because it is associated with an Attendance Calculator account.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Password change email sent to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send password change email to ${toEmail}:`, error);
    return false;
  }
}

/**
 * Send an email notifying the user that their email was updated.
 * @param {string} toEmail 
 * @param {string} userName 
 */
export async function sendEmailChangeNotification(toEmail, userName) {
  try {
    const mailOptions = {
      from: `"Attendance Calculator" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Notice: Your Email Address Has Been Updated',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #3498db;">Email Address Updated</h2>
          <p>Hi ${userName},</p>
          <p>The email address associated with your Attendance Calculator account has been updated to this address.</p>
          <p>If you made this change, you're all set.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="font-size: 12px; color: #888;">
            You received this email because it is associated with an Attendance Calculator account.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email change notification sent to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send email change notification to ${toEmail}:`, error);
    return false;
  }
}

/**
 * Send an email with an OTP to verify identity for password change.
 * @param {string} toEmail 
 * @param {string} userName 
 * @param {string} otp 
 */
export async function sendPasswordOTPEmail(toEmail, userName, otp) {
  try {
    const mailOptions = {
      from: `"Attendance Calculator" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Your Password Change Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #4ade80; text-align: center;">Verify It's You</h2>
          <p>Hi ${userName},</p>
          <p>You requested to change the password for your Attendance Calculator account. Please use the verification code below to proceed.</p>
          <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #111827;">${otp}</span>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you did not request a password change, please ignore this email.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #888; text-align: center;">
            Attendance Calculator Security
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Password OTP email sent to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send password OTP email to ${toEmail}:`, error);
    return false;
  }
}
