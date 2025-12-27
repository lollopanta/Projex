/**
 * ============================================
 * SMART ENGINE ROUTES
 * Internal API endpoints for Smart Engine functionality
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const SmartEngine = require('../services/smartEngine');
const Task = require('../models/Task');
const User = require('../models/User');
const Project = require('../models/Project');

/**
 * @route   POST /api/internal/smart-engine/priority
 * @desc    Calculate priority for a task
 * @access  Private
 */
router.post('/priority', authenticate, async (req, res) => {
  try {
    const { taskId, projectId, assigneeIds } = req.body;

    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    let project = null;
    if (projectId) {
      project = await Project.findById(projectId);
    } else if (task.project) {
      project = await Project.findById(task.project);
    }

    let users = [];
    if (assigneeIds && assigneeIds.length > 0) {
      users = await User.find({ _id: { $in: assigneeIds } });
    } else if (task.assignedTo && task.assignedTo.length > 0) {
      users = await User.find({ _id: { $in: task.assignedTo } });
    }

    const result = await SmartEngine.calculatePriority(task, project, users, {
      currentDate: req.body.currentDate ? new Date(req.body.currentDate) : new Date()
    });

    res.json(result);
  } catch (error) {
    console.error('Priority calculation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/internal/smart-engine/priorities
 * @desc    Calculate priorities for multiple tasks
 * @access  Private
 */
router.post('/priorities', authenticate, async (req, res) => {
  try {
    const { taskIds, projectId } = req.body;

    if (!taskIds || !Array.isArray(taskIds)) {
      return res.status(400).json({ message: 'Task IDs array is required' });
    }

    const tasks = await Task.find({ _id: { $in: taskIds } });
    if (tasks.length === 0) {
      return res.status(404).json({ message: 'No tasks found' });
    }

    let project = null;
    if (projectId) {
      project = await Project.findById(projectId);
    } else if (tasks[0].project) {
      project = await Project.findById(tasks[0].project);
    }

    // Get all unique assignees
    const assigneeIds = [...new Set(
      tasks.flatMap(t => t.assignedTo || []).map(id => id.toString())
    )];
    const users = await User.find({ _id: { $in: assigneeIds } });

    const results = await SmartEngine.calculatePriorities(tasks, project, users, {
      currentDate: req.body.currentDate ? new Date(req.body.currentDate) : new Date()
    });

    res.json(results);
  } catch (error) {
    console.error('Priorities calculation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/internal/smart-engine/workload
 * @desc    Calculate workload for a user
 * @access  Private
 */
router.post('/workload', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all tasks assigned to this user
    const tasks = await Task.find({
      assignedTo: userId,
      completed: false
    });

    const result = await SmartEngine.calculateWorkload(user, tasks);

    res.json(result);
  } catch (error) {
    console.error('Workload calculation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/internal/smart-engine/workloads
 * @desc    Calculate workloads for multiple users
 * @access  Private
 */
router.post('/workloads', authenticate, async (req, res) => {
  try {
    const { userIds, projectId } = req.body;

    let users;
    if (userIds && Array.isArray(userIds)) {
      users = await User.find({ _id: { $in: userIds } });
    } else {
      users = await User.find();
    }

    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    // Get all tasks
    const query = { completed: false };
    if (projectId) {
      query.project = projectId;
    }

    const tasks = await Task.find(query);

    const results = await SmartEngine.calculateWorkloads(users, tasks);

    res.json(results);
  } catch (error) {
    console.error('Workloads calculation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/internal/smart-engine/estimate
 * @desc    Estimate time for a task
 * @access  Private
 */
router.post('/estimate', authenticate, async (req, res) => {
  try {
    const { taskId, userId, projectId } = req.body;

    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    let user = null;
    if (userId) {
      user = await User.findById(userId);
    } else if (task.assignedTo && task.assignedTo.length > 0) {
      user = await User.findById(task.assignedTo[0]);
    }

    let project = null;
    if (projectId) {
      project = await Project.findById(projectId);
    } else if (task.project) {
      project = await Project.findById(task.project);
    }

    // Get historical completed tasks
    const historicalQuery = { completed: true, actualTime: { $exists: true, $gt: 0 } };
    if (project) {
      historicalQuery.project = project._id;
    }
    if (user) {
      historicalQuery.assignedTo = user._id;
    }

    const historicalTasks = await Task.find(historicalQuery)
      .limit(100) // Limit to recent 100 for performance
      .sort({ completedAt: -1 });

    const result = await SmartEngine.estimateTime(task, historicalTasks, user, project);

    res.json(result);
  } catch (error) {
    console.error('Time estimation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/internal/smart-engine/duplicates
 * @desc    Detect duplicate tasks
 * @access  Private
 */
router.post('/duplicates', authenticate, async (req, res) => {
  try {
    const { taskIds, projectId } = req.body;

    let tasks;
    if (taskIds && Array.isArray(taskIds)) {
      tasks = await Task.find({ _id: { $in: taskIds } });
    } else if (projectId) {
      tasks = await Task.find({ project: projectId });
    } else {
      return res.status(400).json({ message: 'Task IDs or Project ID is required' });
    }

    if (tasks.length === 0) {
      return res.status(404).json({ message: 'No tasks found' });
    }

    let project = null;
    if (projectId) {
      project = await Project.findById(projectId);
    } else if (tasks[0].project) {
      project = await Project.findById(tasks[0].project);
    }

    const results = await SmartEngine.detectDuplicates(tasks, project);

    res.json(results);
  } catch (error) {
    console.error('Duplicate detection error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/internal/smart-engine/dependencies
 * @desc    Analyze dependency impact
 * @access  Private
 */
router.post('/dependencies', authenticate, async (req, res) => {
  try {
    const { taskId } = req.body;

    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required' });
    }

    const result = await SmartEngine.analyzeDependencyImpact(taskId);

    res.json(result);
  } catch (error) {
    console.error('Dependency analysis error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
