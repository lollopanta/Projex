/**
 * ============================================
 * SITE SETTINGS MODEL
 * Global application settings (singleton)
 * ============================================
 */

const mongoose = require('mongoose');

const siteSettingsSchema = new mongoose.Schema({
  // Email Configuration
  allowEmailSending: {
    type: Boolean,
    default: true
  },
  requireEmailVerification: {
    type: Boolean,
    default: false
  },
  allowEmail2FA: {
    type: Boolean,
    default: true
  },
  allowTOTP2FA: {
    type: Boolean,
    default: true
  },

  // Application Settings
  defaultTheme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'dark'
  },
  registrationEnabled: {
    type: Boolean,
    default: true
  },

  // Resource Limits
  maxProjectsPerUser: {
    type: Number,
    default: null, // null = unlimited
    min: 1
  },
  maxTasksPerProject: {
    type: Number,
    default: null, // null = unlimited
    min: 1
  },

  // Maintenance Mode
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  maintenanceMessage: {
    type: String,
    default: 'The application is currently under maintenance. Please check back later.',
    maxlength: 500
  },

  // Rate Limiting (email actions)
  emailVerificationCooldown: {
    type: Number,
    default: 60, // seconds between resend attempts
    min: 10
  },
  email2FACooldown: {
    type: Number,
    default: 30, // seconds between email 2FA attempts
    min: 10
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
siteSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get or create settings (singleton pattern)
siteSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  
  if (!settings) {
    // Create default settings if none exist
    settings = new this({});
    await settings.save();
    console.log('Created default site settings');
  }
  
  return settings;
};

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
