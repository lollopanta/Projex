const Project = require('../models/Project');
const List = require('../models/List');
const Task = require('../models/Task');

// Check if user has access to a project
const checkProjectAccess = async (req, res, next) => {
  try {
    // Check for project ID in various places (routes use different param names)
    const projectId = req.params.projectId || req.params.id || req.body.project;
    if (!projectId) return next();

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Owner has full access
    if (project.owner.toString() === req.user._id.toString()) {
      req.projectAccess = 'admin';
      return next();
    }

    // Check if user is a member
    const member = project.members.find(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!member) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }

    req.projectAccess = member.role;
    req.project = project;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error checking project access', error: error.message });
  }
};

// Check if user has access to a list
const checkListAccess = async (req, res, next) => {
  try {
    // Check for list ID in various places (routes use different param names)
    const listId = req.params.listId || req.params.id || req.body.list;
    if (!listId) return next();

    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }

    // Owner has full access
    if (list.owner.toString() === req.user._id.toString()) {
      req.listAccess = 'admin';
      return next();
    }

    // Check if user is a member
    const member = list.members.find(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!member) {
      return res.status(403).json({ message: 'Access denied to this list' });
    }

    req.listAccess = member.role;
    req.list = list;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error checking list access', error: error.message });
  }
};

// Check if user can edit (editor or admin role)
const canEdit = (req, res, next) => {
  const access = req.projectAccess || req.listAccess;
  if (access === 'admin' || access === 'editor') {
    return next();
  }
  return res.status(403).json({ message: 'Edit access denied' });
};

// Check if user can view (any role)
const canView = (req, res, next) => {
  const access = req.projectAccess || req.listAccess;
  if (access) {
    return next();
  }
  return res.status(403).json({ message: 'View access denied' });
};

module.exports = {
  checkProjectAccess,
  checkListAccess,
  canEdit,
  canView
};
