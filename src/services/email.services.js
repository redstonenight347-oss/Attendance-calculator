import nodemailer from 'nodemailer';

// Configure SMTP transporter for Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * 1. Email Verification OTP (Signup)
 * @param {string} toEmail 
 * @param {string} userName 
 * @param {string} otp 
 */
export async function sendSignupOTPEmail(toEmail, userName, otp) {
  try {
    const text = `Hello,

Your verification code for Attendance Calculator is:

${otp}

This code will expire in 10 minutes.

If you did not request this verification, you can safely ignore this email.

Regards,
Attendance Calculator Team

This email was sent from: ${process.env.EMAIL_USER}`;

    const html = `<p>Hello,</p>
<p>Your verification code for Attendance Calculator is:</p>
<p><strong>${otp}</strong></p>
<p>This code will expire in <strong>10 minutes</strong>.</p>
<p>If you did not request this verification, you can safely ignore this email.</p>
<p>Regards,<br>Attendance Calculator Team</p>
<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
<p style="font-size: 12px; color: #888;">This email was sent from: <a href="mailto:${process.env.EMAIL_USER}">${process.env.EMAIL_USER}</a></p>`;

    const mailOptions = {
      from: `"Attendance Calculator" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Your verification code for Attendance Calculator',
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Signup verification email sent to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send signup verification email to ${toEmail}:`, error);
    return false;
  }
}

/**
 * 2. Welcome / First Signup Success Email
 * @param {string} toEmail 
 * @param {string} userName 
 */
export async function sendWelcomeEmail(toEmail, userName) {
  try {
    const text = `Hello ${userName},

Your account has been successfully created.

You can now use Attendance Calculator to manage and estimate attendance more easily.

If you did not create this account, please contact us immediately by replying to this email.

Regards,
Attendance Calculator Team

Email: ${process.env.EMAIL_USER}`;

    const html = `<p>Hello ${userName},</p>
<p>Your account has been successfully created.</p>
<p>You can now use Attendance Calculator to manage and estimate attendance more easily.</p>
<p>If you did not create this account, please contact us immediately by replying to this email.</p>
<p>Regards,<br>Attendance Calculator Team</p>
<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
<p style="font-size: 12px; color: #888;">Email: <a href="mailto:${process.env.EMAIL_USER}">${process.env.EMAIL_USER}</a></p>`;

    const mailOptions = {
      from: `"Attendance Calculator" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Welcome to Attendance Calculator',
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send welcome email to ${toEmail}:`, error);
    return false;
  }
}

/**
 * 3. Password Reset OTP
 * @param {string} toEmail 
 * @param {string} userName 
 * @param {string} otp 
 */
export async function sendPasswordOTPEmail(toEmail, userName, otp) {
  try {
    const text = `Hello,

We received a request to reset your Attendance Calculator password.

Your password reset code is:

${otp}

This code will expire in 10 minutes.

If you did not request a password reset, please ignore this email. Your account will remain secure.

Regards,
Attendance Calculator Team

This email was sent from: ${process.env.EMAIL_USER}`;

    const html = `<p>Hello,</p>
<p>We received a request to reset your Attendance Calculator password.</p>
<p>Your password reset code is:</p>
<p><strong>${otp}</strong></p>
<p>This code will expire in <strong>10 minutes</strong>.</p>
<p>If you did not request a password reset, please ignore this email. Your account will remain secure.</p>
<p>Regards,<br>Attendance Calculator Team</p>
<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
<p style="font-size: 12px; color: #888;">This email was sent from: <a href="mailto:${process.env.EMAIL_USER}">${process.env.EMAIL_USER}</a></p>`;

    const mailOptions = {
      from: `"Attendance Calculator" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Reset your Attendance Calculator password',
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Password reset OTP sent to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send password reset OTP to ${toEmail}:`, error);
    return false;
  }
}

/**
 * 4. Email Change / Email Reset Verification
 * @param {string} toEmail 
 * @param {string} userName 
 * @param {string} [otp] 
 */
export async function sendEmailChangeNotification(toEmail, userName, otp = '123456') {
  try {
    const text = `Hello,

We received a request to change the email address associated with your Attendance Calculator account.

Your verification code is:

${otp}

This code will expire in 10 minutes.

If you did not request this change, please ignore this email and consider updating your password.

Regards,
Attendance Calculator Team

This email was sent from: ${process.env.EMAIL_USER}`;

    const html = `<p>Hello,</p>
<p>We received a request to change the email address associated with your Attendance Calculator account.</p>
<p>Your verification code is:</p>
<p><strong>${otp}</strong></p>
<p>This code will expire in <strong>10 minutes</strong>.</p>
<p>If you did not request this change, please ignore this email and consider updating your password.</p>
<p>Regards,<br>Attendance Calculator Team</p>
<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
<p style="font-size: 12px; color: #888;">This email was sent from: <a href="mailto:${process.env.EMAIL_USER}">${process.env.EMAIL_USER}</a></p>`;

    const mailOptions = {
      from: `"Attendance Calculator" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Change the email address associated with your Attendance Calculator account',
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email change verification sent to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send email change verification to ${toEmail}:`, error);
    return false;
  }
}

/**
 * Security Alert: Password changed confirmation
 * @param {string} toEmail 
 * @param {string} userName 
 */
export async function sendPasswordChangeEmail(toEmail, userName) {
  try {
    const text = `Hello ${userName},

This is a confirmation that the password for your Attendance Calculator account was just changed.

If you made this change, you can safely ignore this email.

If you did not make this change, please contact us immediately by replying to this email.

Regards,
Attendance Calculator Team

Email: ${process.env.EMAIL_USER}`;

    const html = `<p>Hello ${userName},</p>
<p>This is a confirmation that the password for your Attendance Calculator account was just changed.</p>
<p>If you made this change, you can safely ignore this email.</p>
<p><strong>If you did not make this change</strong>, please contact us immediately by replying to this email.</p>
<p>Regards,<br>Attendance Calculator Team</p>
<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
<p style="font-size: 12px; color: #888;">Email: <a href="mailto:${process.env.EMAIL_USER}">${process.env.EMAIL_USER}</a></p>`;

    const mailOptions = {
      from: `"Attendance Calculator" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Security Alert: Your Password Has Been Changed',
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Password change confirmation sent to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send password change confirmation to ${toEmail}:`, error);
    return false;
  }
}
