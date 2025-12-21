const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const List = require('../models/List');
const { authenticate } = require('../middleware/auth');
const { checkProjectAccess, canEdit, canView } = require('../middleware/rbac');

// @route   GET /api/projects
// @desc    Get all projects for user
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ],
      isArchived: false
    })
      .populate('owner', 'username email firstName lastName')
      .populate('members.user', 'username email firstName lastName')
      .sort({ updatedAt: -1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/projects/:id
// @desc    Get a single project
// @access  Private
router.get('/:id', authenticate, checkProjectAccess, canView, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'username email firstName lastName')
      .populate('members.user', 'username email firstName lastName');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get project statistics
    const taskCount = await Task.countDocuments({ project: project._id });
    const completedTaskCount = await Task.countDocuments({ project: project._id, completed: true });
    const listCount = await List.countDocuments({ project: project._id });

    res.json({
      ...project.toObject(),
      stats: {
        tasks: taskCount,
        completedTasks: completedTaskCount,
        lists: listCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private
router.post('/', authenticate, [
  body('name').trim().notEmpty().withMessage('Project name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, color } = req.body;

    const project = new Project({
      name,
      description: description || '',
      owner: req.user._id,
      color: color || '#6366F1',
      members: [{
        user: req.user._id,
        role: 'admin'
      }]
    });

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('owner', 'username email firstName lastName')
      .populate('members.user', 'username email firstName lastName');

    res.status(201).json(populatedProject);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update a project
// @access  Private
router.put('/:id', authenticate, checkProjectAccess, canEdit, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only admin can update project details
    if (req.projectAccess !== 'admin' && project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only project admin can update project details' });
    }

    const { name, description, color } = req.body;
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (color) project.color = color;

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('owner', 'username email firstName lastName')
      .populate('members.user', 'username email firstName lastName');

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete a project
// @access  Private
router.delete('/:id', authenticate, checkProjectAccess, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only owner can delete project
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only project owner can delete the project' });
    }

    await Project.deleteOne({ _id: project._id });
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/projects/:id/members
// @desc    Add a member to project
// @access  Private
router.post('/:id/members', authenticate, checkProjectAccess, canEdit, [
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('role').isIn(['viewer', 'editor', 'admin']).withMessage('Valid role is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findById(req.params.id);
    const { userId, role } = req.body;

    // Check if user is already a member
    const existingMember = project.members.find(m => m.user.toString() === userId);
    if (existingMember) {
      return res.status(400).json({ message: 'User is already a member of this project' });
    }

    project.members.push({ user: userId, role });
    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('owner', 'username email firstName lastName')
      .populate('members.user', 'username email firstName lastName');

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/projects/:id/members/:memberId
// @desc    Remove a member from project
// @access  Private
router.delete('/:id/members/:memberId', authenticate, checkProjectAccess, canEdit, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    const { memberId } = req.params;

    project.members = project.members.filter(m => m.user.toString() !== memberId);
    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('owner', 'username email firstName lastName')
      .populate('members.user', 'username email firstName lastName');

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
