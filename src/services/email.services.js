import nodemailer from 'nodemailer';
import { Resend } from 'resend';

// Initialize Resend if API key is provided
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Initialize SMTP transporter fallback if Gmail credentials are provided
const transporter = (!resend && process.env.EMAIL_USER && process.env.EMAIL_PASS)
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })
  : null;

/**
 * Core helper to dispatch email using Resend (primary) or Nodemailer (fallback).
 */
async function sendMail({ to, subject, html }) {
  if (resend) {
    const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const { data, error } = await resend.emails.send({
      from: `Attendance Calculator <${fromEmail}>`,
      to,
      subject,
      html
    });
    if (error) {
      throw new Error(error.message || JSON.stringify(error));
    }
    return data?.id || 'resend-success';
  } else if (transporter) {
    const info = await transporter.sendMail({
      from: `"Attendance Calculator" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    return info.messageId;
  } else {
    throw new Error('No email service configured. Define RESEND_API_KEY or EMAIL_USER/EMAIL_PASS.');
  }
}

/**
 * Send an email notifying the user that their password was changed.
 * @param {string} toEmail 
 * @param {string} userName 
 */
export async function sendPasswordChangeEmail(toEmail, userName) {
  try {
    const html = `
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
    `;

    const messageId = await sendMail({ to: toEmail, subject: 'Security Alert: Your Password Has Been Changed', html });
    console.log(`Password change email sent to ${toEmail}: ${messageId}`);
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
    const html = `
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
    `;

    const messageId = await sendMail({ to: toEmail, subject: 'Notice: Your Email Address Has Been Updated', html });
    console.log(`Email change notification sent to ${toEmail}: ${messageId}`);
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
    const html = `
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
    `;

    const messageId = await sendMail({ to: toEmail, subject: 'Your Password Change Verification Code', html });
    console.log(`Password OTP email sent to ${toEmail}: ${messageId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send password OTP email to ${toEmail}:`, error);
    return false;
  }
}

/**
 * Send an email with an OTP to verify identity for new user signup.
 * @param {string} toEmail 
 * @param {string} userName 
 * @param {string} otp 
 */
export async function sendSignupOTPEmail(toEmail, userName, otp) {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #3b82f6; text-align: center;">Verify Your Email Address</h2>
        <p>Hi ${userName},</p>
        <p>Thank you for signing up for Attendance Calculator! Please use the 6-digit verification code below to verify your email and complete your registration.</p>
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #111827;">${otp}</span>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this registration, you can safely ignore this email.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888; text-align: center;">
          Attendance Calculator Team
        </p>
      </div>
    `;

    const messageId = await sendMail({ to: toEmail, subject: 'Welcome to Attendance Calculator - Verify Your Email', html });
    console.log(`Signup OTP email sent to ${toEmail}: ${messageId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send signup OTP email to ${toEmail}:`, error);
    return false;
  }
}
