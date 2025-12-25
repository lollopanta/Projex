const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const List = require('../models/List');
const Task = require('../models/Task');
const { authenticate } = require('../middleware/auth');
const { checkListAccess, canEdit, canView } = require('../middleware/rbac');

// @route   GET /api/lists
// @desc    Get all lists for user
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const { projectId } = req.query;
    const query = {
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ],
      isArchived: false
    };

    if (projectId) {
      query.project = projectId;
    }

    const lists = await List.find(query)
      .populate('owner', 'username email firstName lastName')
      .populate('project', 'name color')
      .populate('members.user', 'username email firstName lastName')
      .sort({ position: 1, createdAt: -1 });

    res.json(lists);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/lists/:id
// @desc    Get a single list
// @access  Private
router.get('/:id', authenticate, checkListAccess, canView, async (req, res) => {
  try {
    const list = await List.findById(req.params.id)
      .populate('owner', 'username email firstName lastName')
      .populate('project', 'name color')
      .populate('members.user', 'username email firstName lastName');

    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }

    // Get list statistics
    const taskCount = await Task.countDocuments({ list: list._id });
    const completedTaskCount = await Task.countDocuments({ list: list._id, completed: true });

    res.json({
      ...list.toObject(),
      stats: {
        tasks: taskCount,
        completedTasks: completedTaskCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/lists
// @desc    Create a new list
// @access  Private
router.post('/', authenticate, [
  body('name').trim().notEmpty().withMessage('List name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, project, color } = req.body;

    const list = new List({
      name,
      description: description || '',
      owner: req.user._id,
      project: project || null,
      color: color || '#8B5CF6',
      members: [{
        user: req.user._id,
        role: 'admin'
      }]
    });

    await list.save();

    const populatedList = await List.findById(list._id)
      .populate('owner', 'username email firstName lastName')
      .populate('project', 'name color')
      .populate('members.user', 'username email firstName lastName');

    res.status(201).json(populatedList);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/lists/:id
// @desc    Update a list
// @access  Private
router.put('/:id', authenticate, checkListAccess, canEdit, async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }

    const { name, description, color, position } = req.body;
    if (name) list.name = name;
    if (description !== undefined) list.description = description;
    if (color) list.color = color;
    if (position !== undefined) list.position = position;

    await list.save();

    const updatedList = await List.findById(list._id)
      .populate('owner', 'username email firstName lastName')
      .populate('project', 'name color')
      .populate('members.user', 'username email firstName lastName');

    res.json(updatedList);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/lists/:id
// @desc    Delete a list
// @access  Private
router.delete('/:id', authenticate, checkListAccess, canEdit, async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }

    // Only owner can delete list
    if (list.owner.toString() !== req.user._id.toString() && req.listAccess !== 'admin') {
      return res.status(403).json({ message: 'Only list owner can delete the list' });
    }

    await List.deleteOne({ _id: list._id });
    res.json({ message: 'List deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/lists/:id/members
// @desc    Add a member to list
// @access  Private
router.post('/:id/members', authenticate, checkListAccess, canEdit, [
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('role').isIn(['viewer', 'editor', 'admin']).withMessage('Valid role is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const list = await List.findById(req.params.id);
    const { userId, role } = req.body;

    const existingMember = list.members.find(m => m.user.toString() === userId);
    if (existingMember) {
      return res.status(400).json({ message: 'User is already a member of this list' });
    }

    list.members.push({ user: userId, role });
    await list.save();

    const updatedList = await List.findById(list._id)
      .populate('owner', 'username email firstName lastName')
      .populate('members.user', 'username email firstName lastName');

    res.json(updatedList);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
