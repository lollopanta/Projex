const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const Task = require('../models/Task');
const List = require('../models/List');
const Project = require('../models/Project');
const { authenticate } = require('../middleware/auth');
const { checkListAccess, checkProjectAccess, canEdit, canView } = require('../middleware/rbac');

// @route   GET /api/tasks
// @desc    Get all tasks with filtering
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      listId,
      projectId,
      assignedTo,
      priority,
      label,
      dueDate,
      completed,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = req.query;

    const query = {};

    // Filter by list
    if (listId) {
      query.list = listId;
    }

    // Filter by project
    if (projectId) {
      query.project = projectId;
    }

    // Filter by assigned user
    if (assignedTo) {
      query.assignedTo = assignedTo === 'me' ? req.user._id : assignedTo;
    }

    // Filter by priority
    if (priority) {
      query.priority = priority;
    }

    // Filter by label
    if (label) {
      query.labels = label;
    }

    // Filter by due date
    if (dueDate) {
      const date = new Date(dueDate);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      query.dueDate = { $gte: date, $lt: nextDay };
    }

    // Filter by completion status
    if (completed !== undefined) {
      query.completed = completed === 'true';
    }

    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Ensure user has access to tasks (created by, assigned to, or in accessible lists/projects)
    // This is a simplified version - in production, you'd want more sophisticated access control

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const tasks = await Task.find(query)
      .populate('list', 'name color')
      .populate('project', 'name color')
      .populate('createdBy', 'username email firstName lastName')
      .populate('assignedTo', 'username email firstName lastName')
      .populate('labels', 'name color')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(query);

    res.json({
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/tasks/:id
// @desc    Get a single task
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('list', 'name color owner members')
      .populate('project', 'name color owner members')
      .populate('createdBy', 'username email firstName lastName')
      .populate('assignedTo', 'username email firstName lastName')
      .populate('labels', 'name color')
      .populate('parentTask', 'title');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post('/', authenticate, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('list').isMongoId().withMessage('Valid list ID is required')
], checkListAccess, canEdit, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      list,
      project,
      assignedTo,
      priority,
      labels,
      dueDate,
      reminders,
      subtasks,
      isRecurring,
      recurringPattern
    } = req.body;

    // Verify list exists
    const listDoc = await List.findById(list);
    if (!listDoc) {
      return res.status(404).json({ message: 'List not found' });
    }

    // Verify project if provided
    if (project) {
      const projectDoc = await Project.findById(project);
      if (!projectDoc) {
        return res.status(404).json({ message: 'Project not found' });
      }
    }

    const task = new Task({
      title,
      description,
      list,
      project: project || listDoc.project || null,
      createdBy: req.user._id,
      assignedTo: assignedTo || [],
      priority: priority || 'medium',
      labels: labels || [],
      dueDate: dueDate || null,
      reminders: reminders || [],
      subtasks: subtasks || [],
      isRecurring: isRecurring || false,
      recurringPattern: recurringPattern || null
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('list', 'name color')
      .populate('project', 'name color')
      .populate('createdBy', 'username email firstName lastName')
      .populate('assignedTo', 'username email firstName lastName')
      .populate('labels', 'name color');

    res.status(201).json(populatedTask);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update a task
// @access  Private
router.put('/:id', authenticate, checkListAccess, canEdit, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'createdAt' && key !== 'updatedAt') {
        task[key] = updates[key];
      }
    });

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('list', 'name color')
      .populate('project', 'name color')
      .populate('createdBy', 'username email firstName lastName')
      .populate('assignedTo', 'username email firstName lastName')
      .populate('labels', 'name color');

    res.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Private
router.delete('/:id', authenticate, checkListAccess, canEdit, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await Task.deleteOne({ _id: task._id });
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PATCH /api/tasks/:id/complete
// @desc    Toggle task completion
// @access  Private
router.patch('/:id/complete', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.completed = !task.completed;
    if (task.completed) {
      task.completedAt = new Date();
    } else {
      task.completedAt = null;
    }

    await task.save();

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/tasks/:id/subtasks
// @desc    Add a subtask
// @access  Private
router.post('/:id/subtasks', authenticate, [
  body('title').trim().notEmpty().withMessage('Subtask title is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const { title, description } = req.body;
    const subtask = {
      title,
      description: description || '',
      completed: false,
      position: task.subtasks.length
    };

    task.subtasks.push(subtask);
    await task.save();

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
