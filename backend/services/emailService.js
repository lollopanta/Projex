/**
 * ============================================
 * EMAIL SERVICE
 * Centralized email sending with guards and rate limiting
 * ============================================
 */

const nodemailer = require('nodemailer');
const SiteSettings = require('../models/SiteSettings');

// Email transporter setup
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email configuration not set. Email sending is disabled.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const transporter = createTransporter();

// Rate limiting store (in-memory, could be moved to Redis in production)
const rateLimitStore = new Map();

/**
 * Check if email sending is allowed
 */
const canSendEmail = async () => {
  const settings = await SiteSettings.getSettings();
  return settings.allowEmailSending && transporter !== null;
};

/**
 * Check rate limit for email actions
 */
const checkRateLimit = (key, cooldownSeconds) => {
  const now = Date.now();
  const lastSent = rateLimitStore.get(key);
  
  if (lastSent && (now - lastSent) < cooldownSeconds * 1000) {
    const remaining = Math.ceil((cooldownSeconds * 1000 - (now - lastSent)) / 1000);
    return { allowed: false, remaining };
  }
  
  rateLimitStore.set(key, now);
  return { allowed: true };
};

/**
 * Send email with guards and rate limiting
 */
const sendEmail = async (options) => {
  const { to, subject, html, text, rateLimitKey, cooldownSeconds } = options;

  // Check if email sending is enabled
  const emailEnabled = await canSendEmail();
  if (!emailEnabled) {
    console.log(`Email sending disabled. Skipping email to ${to}`);
    return { sent: false, reason: 'Email sending is disabled' };
  }

  // Check rate limit if provided
  if (rateLimitKey && cooldownSeconds) {
    const rateLimit = checkRateLimit(rateLimitKey, cooldownSeconds);
    if (!rateLimit.allowed) {
      return { 
        sent: false, 
        reason: 'Rate limit exceeded', 
        remaining: rateLimit.remaining 
      };
    }
  }

  try {
    const mailOptions = {
      from: `"Projex" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text fallback
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}`);
    return { sent: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { sent: false, reason: error.message };
  }
};

/**
 * Send email verification email
 */
const sendVerificationEmail = async (user, token) => {
  if (!token) {
    console.error('No token provided for email verification');
    return { sent: false, reason: 'No token provided' };
  }
  
  const settings = await SiteSettings.getSettings();
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #6366F1; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Verify Your Email Address</h2>
          <p>Hello ${user.firstName || user.username},</p>
          <p>Thank you for registering with Projex! Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" class="button">Verify Email</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6366F1;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <div class="footer">
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Verify Your Projex Account',
    html,
    rateLimitKey: `verification:${user._id}`,
    cooldownSeconds: settings.emailVerificationCooldown
  });
};

/**
 * Send email 2FA code
 */
const sendEmail2FACode = async (user, code) => {
  const settings = await SiteSettings.getSettings();

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; background-color: #f3f4f6; border-radius: 8px; margin: 20px 0; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Your Projex Login Code</h2>
          <p>Hello ${user.firstName || user.username},</p>
          <p>Your two-factor authentication code is:</p>
          <div class="code">${code}</div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email and secure your account.</p>
          <div class="footer">
            <p>This is an automated message. Please do not reply.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Your Projex Login Code',
    html,
    rateLimitKey: `email2fa:${user._id}`,
    cooldownSeconds: settings.email2FACooldown
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendEmail2FACode,
  canSendEmail,
  checkRateLimit
};
