/**
 * ============================================
 * ADMIN ROUTES
 * Admin-only endpoints for site settings management
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const SiteSettings = require('../models/SiteSettings');
const User = require('../models/User');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// @route   GET /api/admin/settings
// @desc    Get site settings
// @access  Private (Admin only)
router.get('/settings', async (req, res) => {
  try {
    const settings = await SiteSettings.getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching site settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/admin/settings
// @desc    Update site settings
// @access  Private (Admin only)
router.put('/settings', [
  body('allowEmailSending').optional().isBoolean(),
  body('requireEmailVerification').optional().isBoolean(),
  body('allowEmail2FA').optional().isBoolean(),
  body('allowTOTP2FA').optional().isBoolean(),
  body('defaultTheme').optional().isIn(['light', 'dark']),
  body('registrationEnabled').optional().isBoolean(),
  body('maxProjectsPerUser').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    const num = parseInt(value);
    return !isNaN(num) && num >= 1;
  }).withMessage('maxProjectsPerUser must be a positive integer or null'),
  body('maxTasksPerProject').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    const num = parseInt(value);
    return !isNaN(num) && num >= 1;
  }).withMessage('maxTasksPerProject must be a positive integer or null'),
  body('maintenanceMode').optional().isBoolean(),
  body('maintenanceMessage').optional().isString().isLength({ max: 500 }),
  body('emailVerificationCooldown').optional().isInt({ min: 10 }),
  body('email2FACooldown').optional().isInt({ min: 10 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const settings = await SiteSettings.getSettings();
    
    // Update only provided fields
    const updateFields = [
      'allowEmailSending',
      'requireEmailVerification',
      'allowEmail2FA',
      'allowTOTP2FA',
      'defaultTheme',
      'registrationEnabled',
      'maxProjectsPerUser',
      'maxTasksPerProject',
      'maintenanceMode',
      'maintenanceMessage',
      'emailVerificationCooldown',
      'email2FACooldown'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        // Handle null values for optional fields
        if (field === 'maxProjectsPerUser' || field === 'maxTasksPerProject') {
          settings[field] = req.body[field] === null || req.body[field] === '' ? null : req.body[field];
        } else {
          settings[field] = req.body[field];
        }
      }
    });

    await settings.save();

    res.json({
      message: 'Site settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Error updating site settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/admin/stats
// @desc    Get admin statistics
// @access  Private (Admin only)
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ emailVerified: true });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const usersWith2FA = await User.countDocuments({ twoFactorEnabled: true });

    res.json({
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        admins: adminUsers,
        with2FA: usersWith2FA
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
