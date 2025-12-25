const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const List = require('../models/List');
const Project = require('../models/Project');
const { authenticate } = require('../middleware/auth');
const { checkListAccess, canEdit } = require('../middleware/rbac');
const dependencyService = require('../services/dependencyService');

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
      .populate('dependencies', 'title completed priority dueDate')
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
      .populate('parentTask', 'title')
      .populate('dependencies', 'title completed priority dueDate');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Compute blocked status
    const isBlocked = await dependencyService.isTaskBlocked(task);

    // Convert to plain object and add computed field
    const taskObj = task.toObject();
    taskObj.isBlocked = isBlocked;

    res.json(taskObj);
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
      recurringPattern,
      dependencies
    } = req.body;

    // Verify list exists
    const listDoc = await List.findById(list);
    if (!listDoc) {
      return res.status(404).json({ message: 'List not found' });
    }

    // Verify project if provided
    const projectId = project || listDoc.project;
    let projectDoc = null;
    if (projectId) {
      projectDoc = await Project.findById(projectId);
      if (!projectDoc) {
        return res.status(404).json({ message: 'Project not found' });
      }
    }

    // Validate assignees if provided
    if (assignedTo && Array.isArray(assignedTo) && assignedTo.length > 0) {
      // Check if user has permission to assign tasks
      let canAssign = false;
      if (projectDoc) {
        const isOwner = projectDoc.owner.toString() === req.user._id.toString();
        const member = projectDoc.members.find(m => m.user.toString() === req.user._id.toString());
        canAssign = isOwner || (member && ['admin', 'editor'].includes(member.role));
      } else {
        // If no project, check list permissions
        const isListOwner = listDoc.owner.toString() === req.user._id.toString();
        const listMember = listDoc.members.find(m => m.user.toString() === req.user._id.toString());
        canAssign = isListOwner || (listMember && ['admin', 'editor'].includes(listMember.role));
      }

      if (!canAssign) {
        return res.status(403).json({ message: 'You do not have permission to assign tasks' });
      }

      // Validate each assignee is a project/list member
      const User = require('../models/User');
      for (const userId of assignedTo) {
        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
          return res.status(400).json({ message: `User ${userId} not found` });
        }

        // Check if user is a project member (if project exists)
        if (projectDoc) {
          const isProjectOwner = projectDoc.owner.toString() === userId;
          const isProjectMember = projectDoc.members.some(m => m.user.toString() === userId);
          if (!isProjectOwner && !isProjectMember) {
            return res.status(400).json({ message: `User ${userId} is not a member of this project` });
          }

          // Check if list has restricted members
          if (listDoc.members && listDoc.members.length > 0) {
            const isListOwner = listDoc.owner.toString() === userId;
            const isListMember = listDoc.members.some(m => m.user.toString() === userId);
            if (!isListOwner && !isListMember) {
              return res.status(400).json({ message: `User ${userId} is not allowed in this list` });
            }
          }
        } else {
          // If no project, check list membership
          const isListOwner = listDoc.owner.toString() === userId;
          const isListMember = listDoc.members.some(m => m.user.toString() === userId);
          if (!isListOwner && !isListMember) {
            return res.status(400).json({ message: `User ${userId} is not a member of this list` });
          }
        }
      }
    }

    // Validate dependencies if provided
    if (dependencies && Array.isArray(dependencies) && dependencies.length > 0) {
      const validation = await dependencyService.validateDependencies(null, dependencies);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }
    }

    const task = new Task({
      title,
      description,
      list,
      project: projectId || null,
      createdBy: req.user._id,
      assignedTo: assignedTo || [],
      priority: priority || 'medium',
      labels: labels || [],
      dueDate: dueDate || null,
      reminders: reminders || [],
      subtasks: subtasks || [],
      isRecurring: isRecurring || false,
      recurringPattern: recurringPattern || null,
      dependencies: dependencies || []
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('list', 'name color')
      .populate('project', 'name color')
      .populate('createdBy', 'username email firstName lastName')
      .populate('assignedTo', 'username email firstName lastName')
      .populate('labels', 'name color')
      .populate('dependencies', 'title completed priority dueDate');

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
    const task = await Task.findById(req.params.id).populate('list').populate('project');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const updates = req.body;

    // Validate assignees if being updated
    if (updates.assignedTo !== undefined && Array.isArray(updates.assignedTo)) {
      const listDoc = task.list;
      const projectDoc = task.project;

      // Check if user has permission to assign tasks
      let canAssign = false;
      if (projectDoc) {
        const isOwner = projectDoc.owner.toString() === req.user._id.toString();
        const member = projectDoc.members.find(m => m.user.toString() === req.user._id.toString());
        canAssign = isOwner || (member && ['admin', 'editor'].includes(member.role));
      } else if (listDoc) {
        const isListOwner = listDoc.owner.toString() === req.user._id.toString();
        const listMember = listDoc.members.find(m => m.user.toString() === req.user._id.toString());
        canAssign = isListOwner || (listMember && ['admin', 'editor'].includes(listMember.role));
      }

      if (!canAssign && updates.assignedTo.length > 0) {
        return res.status(403).json({ message: 'You do not have permission to assign tasks' });
      }

      // Validate each assignee
      if (updates.assignedTo.length > 0) {
        const User = require('../models/User');
        for (const userId of updates.assignedTo) {
          const user = await User.findById(userId);
          if (!user) {
            return res.status(400).json({ message: `User ${userId} not found` });
          }

          if (projectDoc) {
            const isProjectOwner = projectDoc.owner.toString() === userId;
            const isProjectMember = projectDoc.members.some(m => m.user.toString() === userId);
            if (!isProjectOwner && !isProjectMember) {
              return res.status(400).json({ message: `User ${userId} is not a member of this project` });
            }

            if (listDoc.members && listDoc.members.length > 0) {
              const isListOwner = listDoc.owner.toString() === userId;
              const isListMember = listDoc.members.some(m => m.user.toString() === userId);
              if (!isListOwner && !isListMember) {
                return res.status(400).json({ message: `User ${userId} is not allowed in this list` });
              }
            }
          } else if (listDoc) {
            const isListOwner = listDoc.owner.toString() === userId;
            const isListMember = listDoc.members.some(m => m.user.toString() === userId);
            if (!isListOwner && !isListMember) {
              return res.status(400).json({ message: `User ${userId} is not a member of this list` });
            }
          }
        }
      }
    }

    // Validate dependencies if being updated
    if (updates.dependencies !== undefined && Array.isArray(updates.dependencies)) {
      const validation = await dependencyService.validateDependencies(req.params.id, updates.dependencies);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }
    }

    const wasCompleted = task.completed;
    const willBeCompleted = updates.completed === true;

    // Validate and sanitize updates
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'createdAt' && key !== 'updatedAt') {
        // Special handling for kanbanColumnId - must be a valid ObjectId or null
        if (key === 'kanbanColumnId') {
          const value = updates[key];
          // If it's a default column string ("todo", "in-progress", "done"), set to null
          if (value === 'todo' || value === 'in-progress' || value === 'done' || value === '') {
            task[key] = null;
          } else if (value === null || value === undefined) {
            task[key] = null;
          } else {
            // Try to validate it's a valid ObjectId
            if (mongoose.Types.ObjectId.isValid(value)) {
              task[key] = value;
            } else {
              // Invalid ObjectId, set to null
              task[key] = null;
            }
          }
        } else {
          task[key] = updates[key];
        }
      }
    });

    await task.save();

    // If task was just completed, unblock dependent tasks
    if (!wasCompleted && willBeCompleted) {
      await dependencyService.unblockDependentTasks(task._id.toString());
    }

    const updatedTask = await Task.findById(task._id)
      .populate('list', 'name color')
      .populate('project', 'name color')
      .populate('createdBy', 'username email firstName lastName')
      .populate('assignedTo', 'username email firstName lastName')
      .populate('labels', 'name color')
      .populate('dependencies', 'title completed priority dueDate');

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

    const wasCompleted = task.completed;
    task.completed = !task.completed;
    if (task.completed) {
      task.completedAt = new Date();
    } else {
      task.completedAt = null;
    }

    await task.save();

    // If task was just completed, unblock dependent tasks
    if (!wasCompleted && task.completed) {
      await dependencyService.unblockDependentTasks(task._id.toString());
    }

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

// ============================================
// DEPENDENCY ROUTES
// ============================================

// @route   GET /api/tasks/:id/dependencies
// @desc    Get dependency graph for a task
// @access  Private
router.get('/:id/dependencies', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const graph = await dependencyService.getDependencyGraph(req.params.id, 5);
    const isBlocked = await dependencyService.isTaskBlocked(task);

    res.json({
      task: graph.task,
      upstream: graph.upstream.map(item => ({
        task: item.task,
        depth: item.depth
      })),
      downstream: graph.downstream.map(item => ({
        task: item.task,
        depth: item.depth
      })),
      isBlocked
    });
  } catch (error) {
    console.error('Get dependencies error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/tasks/:id/dependencies
// @desc    Add dependencies to a task
// @access  Private
router.post('/:id/dependencies', authenticate, checkListAccess, canEdit, [
  body('dependencies').isArray().withMessage('Dependencies must be an array'),
  body('dependencies.*').isMongoId().withMessage('Each dependency must be a valid task ID')
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

    const { dependencies } = req.body;

    // Merge with existing dependencies (avoid duplicates)
    const existingDeps = task.dependencies.map(dep => dep.toString());
    const newDeps = dependencies.map(dep => dep.toString());
    const allDeps = [...new Set([...existingDeps, ...newDeps])];

    // Validate
    const validation = await dependencyService.validateDependencies(req.params.id, allDeps);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.error });
    }

    task.dependencies = allDeps;
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('dependencies', 'title completed priority dueDate')
      .populate('list', 'name color')
      .populate('project', 'name color')
      .populate('assignedTo', 'username firstName lastName')
      .populate('labels', 'name color');

    res.json(populatedTask);
  } catch (error) {
    console.error('Add dependencies error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/tasks/:id/dependencies/:dependencyId
// @desc    Remove a dependency from a task
// @access  Private
router.delete('/:id/dependencies/:dependencyId', authenticate, checkListAccess, canEdit, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const dependencyId = req.params.dependencyId;
    task.dependencies = task.dependencies.filter(
      dep => dep.toString() !== dependencyId
    );

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('dependencies', 'title completed priority dueDate')
      .populate('list', 'name color')
      .populate('project', 'name color')
      .populate('assignedTo', 'username firstName lastName')
      .populate('labels', 'name color');

    res.json(populatedTask);
  } catch (error) {
    console.error('Remove dependency error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/tasks/:id/impact
// @desc    Get impact analysis for a task (what tasks are blocked by this one)
// @access  Private
router.get('/:id/impact', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const impact = await dependencyService.getImpactedTasks(req.params.id);

    // Get task details for impacted tasks
    const impactedTasks = await Task.find({
      _id: { $in: impact.all }
    })
      .populate('list', 'name color')
      .populate('project', 'name color')
      .select('title completed priority dueDate list project');

    res.json({
      task: {
        _id: task._id,
        title: task.title,
        completed: task.completed
      },
      direct: impact.direct.length,
      indirect: impact.indirect.length,
      total: impact.all.length,
      impactedTasks: impactedTasks.map(t => ({
        _id: t._id,
        title: t.title,
        completed: t.completed,
        priority: t.priority,
        dueDate: t.dueDate,
        list: t.list,
        project: t.project,
        isDirect: impact.direct.includes(t._id.toString())
      }))
    });
  } catch (error) {
    console.error('Get impact error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
