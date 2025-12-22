/**
 * ============================================
 * RESOURCE LIMIT MIDDLEWARE
 * Enforces project and task limits per user
 * ============================================
 */

const SiteSettings = require('../models/SiteSettings');
const Project = require('../models/Project');
const Task = require('../models/Task');

const checkProjectLimit = async (req, res, next) => {
  try {
    const settings = await SiteSettings.getSettings();
    
    // No limit if maxProjectsPerUser is null
    if (!settings.maxProjectsPerUser) {
      return next();
    }

    // Only check on project creation
    if (req.method === 'POST' && req.path.includes('/projects')) {
      const userId = req.user._id;
      const projectCount = await Project.countDocuments({ owner: userId });
      
      if (projectCount >= settings.maxProjectsPerUser) {
        return res.status(403).json({
          message: `You have reached the maximum limit of ${settings.maxProjectsPerUser} projects`
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error checking project limit:', error);
    next();
  }
};

const checkTaskLimit = async (req, res, next) => {
  try {
    const settings = await SiteSettings.getSettings();
    
    // No limit if maxTasksPerProject is null
    if (!settings.maxTasksPerProject) {
      return next();
    }

    // Only check on task creation
    if (req.method === 'POST' && req.path.includes('/tasks')) {
      const { project } = req.body;
      
      if (project) {
        const taskCount = await Task.countDocuments({ project });
        
        if (taskCount >= settings.maxTasksPerProject) {
          return res.status(403).json({
            message: `This project has reached the maximum limit of ${settings.maxTasksPerProject} tasks`
          });
        }
      }
    }

    next();
  } catch (error) {
    console.error('Error checking task limit:', error);
    next();
  }
};

module.exports = { checkProjectLimit, checkTaskLimit };
