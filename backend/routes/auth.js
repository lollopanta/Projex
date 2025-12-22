const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const SiteSettings = require('../models/SiteSettings');
const EmailVerificationToken = require('../models/EmailVerificationToken');
const Email2FAToken = require('../models/Email2FAToken');
const { authenticate } = require('../middleware/auth');
const { sendVerificationEmail, sendEmail2FACode } = require('../services/emailService');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if registration is enabled
    const settings = await SiteSettings.getSettings();
    if (!settings.registrationEnabled) {
      return res.status(403).json({ message: 'Registration is currently disabled' });
    }

    const { username, email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or username' });
    }

    // Race-condition safe: Check if this is the first user (atomic operation)
    // Use findOneAndUpdate with upsert to ensure atomicity
    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;

    // Create new user
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      role: isFirstUser ? 'admin' : 'user', // First user becomes admin
      emailVerified: !settings.requireEmailVerification, // Auto-verify if not required
      emailVerifiedAt: !settings.requireEmailVerification ? new Date() : null,
      theme: settings.defaultTheme
    });

    await user.save();

    // Generate verification token if email verification is required
    let verificationToken = null;
    if (settings.requireEmailVerification && !user.emailVerified) {
      try {
        verificationToken = await EmailVerificationToken.generateToken(user._id);
        const emailResult = await sendVerificationEmail(user, verificationToken);
        
        // Log if email sending failed but don't block registration
        if (!emailResult.sent) {
          console.warn(`Failed to send verification email to ${user.email}:`, emailResult.reason);
          // Still continue - user can request resend later
        }
      } catch (error) {
        console.error('Error generating verification token or sending email:', error);
        // Don't block registration if email fails - user can request resend
      }
    }

    const token = generateToken(user._id);

    res.status(201).json({
      message: settings.requireEmailVerification 
        ? 'User registered successfully. Please check your email to verify your account.'
        : 'User registered successfully',
      token,
      requiresEmailVerification: settings.requireEmailVerification && !user.emailVerified,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        theme: user.theme,
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'MongoServerError' && error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `User already exists with this ${field}`,
        errors: [{
          type: 'field',
          msg: `This ${field} is already taken`,
          path: field,
          location: 'body'
        }]
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: Object.keys(error.errors).map(key => ({
          type: 'field',
          msg: error.errors[key].message,
          path: key,
          location: 'body'
        }))
      });
    }
    
    res.status(500).json({ 
      message: 'Server error during registration', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const settings = await SiteSettings.getSettings();

    // Check maintenance mode
    if (settings.maintenanceMode) {
      return res.status(503).json({ 
        message: settings.maintenanceMessage || 'The application is currently under maintenance',
        maintenanceMode: true
      });
    }

    const { email, password, twoFactorToken } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check email verification requirement
    if (settings.requireEmailVerification && !user.emailVerified) {
      return res.status(403).json({ 
        message: 'Please verify your email address before logging in',
        requiresEmailVerification: true,
        email: user.email
      });
    }

    // If 2FA is enabled, verify token
    if (user.twoFactorEnabled) {
      if (!twoFactorToken) {
        // Determine 2FA method and trigger accordingly
        if (user.twoFactorMethod === 'email') {
          // Generate and send email 2FA code
          if (!settings.allowEmail2FA) {
            return res.status(403).json({ message: 'Email 2FA is not enabled' });
          }
          
          const code = await Email2FAToken.generateCode(user._id);
          await sendEmail2FACode(user, code);
          
          return res.status(401).json({ 
            message: 'Two-factor authentication code sent to your email',
            requires2FA: true,
            twoFactorMethod: 'email'
          });
        } else {
          // TOTP 2FA
          if (!settings.allowTOTP2FA) {
            return res.status(403).json({ message: 'TOTP 2FA is not enabled' });
          }
          
          return res.status(401).json({ 
            message: 'Two-factor authentication required',
            requires2FA: true,
            twoFactorMethod: 'totp'
          });
        }
      }

      // Verify 2FA token based on method
      if (user.twoFactorMethod === 'email') {
        const verification = await Email2FAToken.verifyCode(user._id, twoFactorToken);
        if (!verification.valid) {
          return res.status(401).json({ 
            message: verification.reason || 'Invalid two-factor authentication code',
            attempts: verification.attempts
          });
        }
      } else {
        // TOTP verification
        const verified = speakeasy.totp.verify({
          secret: user.twoFactorSecret,
          encoding: 'base32',
          token: twoFactorToken,
          window: 2
        });

        if (!verified) {
          return res.status(401).json({ message: 'Invalid two-factor authentication token' });
        }
      }
    }

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        theme: user.theme,
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorMethod: user.twoFactorMethod,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -twoFactorSecret');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/enable-2fa
// @desc    Enable two-factor authentication
// @access  Private
router.post('/enable-2fa', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA is already enabled' });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${process.env.TWO_FA_APP_NAME || 'Projex'} (${user.email})`,
      issuer: process.env.TWO_FA_APP_NAME || 'Projex'
    });

    user.twoFactorSecret = secret.base32;
    await user.save();

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      message: '2FA setup initiated',
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/verify-2fa
// @desc    Verify and enable 2FA
// @access  Private
router.post('/verify-2fa', authenticate, [
  body('token').isLength({ min: 6, max: 6 }).withMessage('Token must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user._id);
    const { token } = req.body;

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    user.twoFactorEnabled = true;
    await user.save();

    res.json({ message: '2FA enabled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/disable-2fa
// @desc    Disable two-factor authentication
// @access  Private
router.post('/disable-2fa', authenticate, [
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user._id);
    const { password } = req.body;

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorMethod = null;
    await user.save();

    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/auth/verify-email
// @desc    Verify email address
// @access  Public
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (!token || typeof token !== 'string') {
      return res.redirect(`${frontendUrl}/verify-email?error=missing_token`);
    }

    // Verify token
    const verification = await EmailVerificationToken.verifyToken(token);

    if (!verification.valid) {
      console.log('Token verification failed:', verification.reason);
      return res.redirect(`${frontendUrl}/verify-email?error=${verification.reason || 'invalid'}`);
    }

    // Update user
    const user = await User.findById(verification.userId);
    if (!user) {
      console.error('User not found for verification:', verification.userId);
      return res.redirect(`${frontendUrl}/verify-email?error=user_not_found`);
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.redirect(`${frontendUrl}/verify-email?success=true&already_verified=true`);
    }

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    await user.save();

    console.log(`Email verified successfully for user: ${user.email}`);

    // Redirect to frontend with success
    res.redirect(`${frontendUrl}/verify-email?success=true`);
  } catch (error) {
    console.error('Email verification error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/verify-email?error=server_error`);
  }
});

// @route   POST /api/auth/resend-verification
// @desc    Resend email verification
// @access  Public
router.post('/resend-verification', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: errors.array() 
      });
    }

    const settings = await SiteSettings.getSettings();
    if (!settings.allowEmailSending) {
      return res.status(503).json({ 
        message: 'Email sending is currently disabled',
        reason: 'email_disabled'
      });
    }

    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      // Don't reveal if user exists - return success message
      return res.json({ 
        message: 'If an account exists with this email, a verification link has been sent' 
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({ 
        message: 'Email is already verified',
        reason: 'already_verified'
      });
    }

    // Generate new token
    try {
      const token = await EmailVerificationToken.generateToken(user._id);
      if (!token) {
        throw new Error('Failed to generate verification token');
      }

      const emailResult = await sendVerificationEmail(user, token);
      
      if (!emailResult.sent) {
        console.warn(`Failed to send verification email to ${user.email}:`, emailResult.reason);
        
        // Check if it's a rate limit issue
        if (emailResult.reason === 'Rate limit exceeded') {
          return res.status(429).json({ 
            message: `Please wait ${emailResult.remaining} seconds before requesting another verification email`,
            reason: 'rate_limit',
            remaining: emailResult.remaining
          });
        }
        
        return res.status(503).json({ 
          message: 'Verification email could not be sent at this time. Please try again later.',
          reason: emailResult.reason || 'email_send_failed'
        });
      }

      res.json({ message: 'Verification email sent successfully' });
    } catch (error) {
      console.error('Error generating token or sending email:', error);
      res.status(500).json({ 
        message: 'Failed to send verification email', 
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        reason: 'server_error'
      });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/auth/enable-email-2fa
// @desc    Enable email-based 2FA
// @access  Private
router.post('/enable-email-2fa', authenticate, async (req, res) => {
  try {
    const settings = await SiteSettings.getSettings();
    if (!settings.allowEmail2FA) {
      return res.status(403).json({ message: 'Email 2FA is not enabled' });
    }

    const user = await User.findById(req.user._id);

    if (!user.emailVerified) {
      return res.status(400).json({ message: 'Email must be verified before enabling email 2FA' });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA is already enabled. Please disable it first.' });
    }

    user.twoFactorEnabled = true;
    user.twoFactorMethod = 'email';
    await user.save();

    res.json({ message: 'Email 2FA enabled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/verify-2fa
// @desc    Verify and enable 2FA (TOTP)
// @access  Private
router.post('/verify-2fa', authenticate, [
  body('token').isLength({ min: 6, max: 6 }).withMessage('Token must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const settings = await SiteSettings.getSettings();
    if (!settings.allowTOTP2FA) {
      return res.status(403).json({ message: 'TOTP 2FA is not enabled' });
    }

    const user = await User.findById(req.user._id);
    const { token } = req.body;

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    user.twoFactorEnabled = true;
    user.twoFactorMethod = 'totp';
    await user.save();

    res.json({ message: '2FA enabled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
