/**
 * ============================================
 * MAINTENANCE MODE MIDDLEWARE
 * Blocks requests when maintenance mode is enabled
 * ============================================
 */

const SiteSettings = require('../models/SiteSettings');

const checkMaintenanceMode = async (req, res, next) => {
  try {
    // Allow health check and auth endpoints during maintenance
    const allowedPaths = ['/api/health', '/api/auth/login', '/api/auth/register'];
    if (allowedPaths.includes(req.path)) {
      return next();
    }

    const settings = await SiteSettings.getSettings();
    
    if (settings.maintenanceMode) {
      return res.status(503).json({
        message: settings.maintenanceMessage || 'The application is currently under maintenance',
        maintenanceMode: true
      });
    }

    next();
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    // Don't block on error, allow request to proceed
    next();
  }
};

module.exports = { checkMaintenanceMode };
