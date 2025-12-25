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
router.post('/:id/members', authenticate, checkProjectAccess, [
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('role').isIn(['viewer', 'editor', 'admin']).withMessage('Valid role is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only admin can add members
    if (req.projectAccess !== 'admin' && project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only project admin can add members' });
    }

    const { userId, role } = req.body;

    // Check if user exists
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already a member
    const existingMember = project.members.find(m => m.user.toString() === userId);
    if (existingMember) {
      return res.status(400).json({ message: 'User is already a member of this project' });
    }

    // Cannot add owner as member
    if (project.owner.toString() === userId) {
      return res.status(400).json({ message: 'Project owner is already a member' });
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

// @route   PUT /api/projects/:id/members/:memberId
// @desc    Update a member's role in project
// @access  Private
router.put('/:id/members/:memberId', authenticate, checkProjectAccess, [
  body('role').isIn(['viewer', 'editor', 'admin']).withMessage('Valid role is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only admin can update member roles
    if (req.projectAccess !== 'admin' && project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only project admin can update member roles' });
    }

    const { memberId } = req.params;
    const { role } = req.body;

    const member = project.members.find(m => m.user.toString() === memberId);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Cannot change owner's role
    if (project.owner.toString() === memberId) {
      return res.status(400).json({ message: 'Cannot change owner role' });
    }

    member.role = role;
    await project.save();

    // If member was removed or downgraded, unassign from all tasks
    if (role === 'viewer' || !role) {
      await Task.updateMany(
        { project: project._id, assignedTo: memberId },
        { $pull: { assignedTo: memberId } }
      );
    }

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
router.delete('/:id/members/:memberId', authenticate, checkProjectAccess, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only admin can remove members
    if (req.projectAccess !== 'admin' && project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only project admin can remove members' });
    }

    const { memberId } = req.params;

    // Cannot remove owner
    if (project.owner.toString() === memberId) {
      return res.status(400).json({ message: 'Cannot remove project owner' });
    }

    // Remove member
    project.members = project.members.filter(m => m.user.toString() !== memberId);
    await project.save();

    // Unassign user from all tasks in this project
    await Task.updateMany(
      { project: project._id, assignedTo: memberId },
      { $pull: { assignedTo: memberId } }
    );

    const updatedProject = await Project.findById(project._id)
      .populate('owner', 'username email firstName lastName')
      .populate('members.user', 'username email firstName lastName');

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================
// KANBAN COLUMNS ROUTES
// ============================================

// @route   GET /api/projects/:id/columns
// @desc    Get all Kanban columns for a project
// @access  Private
router.get('/:id/columns', authenticate, checkProjectAccess, canView, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Sort columns by position
    const columns = (project.kanbanColumns || []).sort((a, b) => a.position - b.position);
    res.json(columns);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/projects/:id/columns
// @desc    Create a new Kanban column
// @access  Private
router.post('/:id/columns', authenticate, checkProjectAccess, [
  body('name').trim().notEmpty().withMessage('Column name is required'),
  body('color').optional().isHexColor().withMessage('Valid color is required'),
  body('position').optional().isInt().withMessage('Position must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only admin can create columns
    if (req.projectAccess !== 'admin' && project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only project admin can create columns' });
    }

    const { name, color, position } = req.body;

    // Get max position if not provided
    const maxPosition = project.kanbanColumns.length > 0
      ? Math.max(...project.kanbanColumns.map(col => col.position))
      : -1;

    const newColumn = {
      name,
      color: color || '#6366F1',
      position: position !== undefined ? position : maxPosition + 1
    };

    project.kanbanColumns.push(newColumn);
    await project.save();

    // Get the newly created column (last one in array)
    const createdColumn = project.kanbanColumns[project.kanbanColumns.length - 1];
    res.status(201).json(createdColumn);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/projects/:id/columns/:columnId
// @desc    Update a Kanban column
// @access  Private
router.put('/:id/columns/:columnId', authenticate, checkProjectAccess, [
  body('name').optional().trim().notEmpty().withMessage('Column name cannot be empty'),
  body('color').optional().isHexColor().withMessage('Valid color is required'),
  body('position').optional().isInt().withMessage('Position must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only admin can update columns
    if (req.projectAccess !== 'admin' && project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only project admin can update columns' });
    }

    const { columnId } = req.params;
    const { name, color, position } = req.body;

    const column = project.kanbanColumns.id(columnId);
    if (!column) {
      return res.status(404).json({ message: 'Column not found' });
    }

    if (name !== undefined) column.name = name;
    if (color !== undefined) column.color = color;
    if (position !== undefined) column.position = position;

    await project.save();
    res.json(column);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/projects/:id/columns/:columnId
// @desc    Delete a Kanban column
// @access  Private
router.delete('/:id/columns/:columnId', authenticate, checkProjectAccess, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only admin can delete columns
    if (req.projectAccess !== 'admin' && project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only project admin can delete columns' });
    }

    const { columnId } = req.params;

    const column = project.kanbanColumns.id(columnId);
    if (!column) {
      return res.status(404).json({ message: 'Column not found' });
    }

    // Remove column
    project.kanbanColumns.pull(columnId);
    await project.save();

    // Move tasks from deleted column to first column or unassign
    const Task = require('../models/Task');
    const remainingColumns = project.kanbanColumns;
    if (remainingColumns.length > 0) {
      // Move to first column
      const firstColumnId = remainingColumns[0]._id;
      await Task.updateMany(
        { project: project._id, kanbanColumnId: columnId },
        { kanbanColumnId: firstColumnId }
      );
    } else {
      // Unassign if no columns left
      await Task.updateMany(
        { project: project._id, kanbanColumnId: columnId },
        { $unset: { kanbanColumnId: 1 } }
      );
    }

    res.json({ message: 'Column deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
