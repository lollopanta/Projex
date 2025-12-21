const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const List = require('../models/List');
const Label = require('../models/Label');
const Comment = require('../models/Comment');
const { authenticate } = require('../middleware/auth');

// @route   GET /api/backup/export
// @desc    Export user data as backup
// @access  Private
router.get('/export', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all user data
    const tasks = await Task.find({
      $or: [
        { createdBy: userId },
        { assignedTo: userId }
      ]
    }).populate('list project createdBy assignedTo labels');

    const projects = await Project.find({
      $or: [
        { owner: userId },
        { 'members.user': userId }
      ]
    }).populate('owner members.user');

    const lists = await List.find({
      $or: [
        { owner: userId },
        { 'members.user': userId }
      ]
    }).populate('owner project members.user');

    const labels = await Label.find({ createdBy: userId });

    const taskIds = tasks.map(t => t._id);
    const comments = await Comment.find({
      task: { $in: taskIds }
    }).populate('user');

    const backup = {
      version: '1.0',
      exportedAt: new Date(),
      user: {
        id: userId,
        username: req.user.username,
        email: req.user.email
      },
      data: {
        tasks,
        projects,
        lists,
        labels,
        comments
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=projex-backup-${Date.now()}.json`);
    res.json(backup);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/backup/import
// @desc    Import user data from backup
// @access  Private
router.post('/import', authenticate, async (req, res) => {
  try {
    const { data } = req.body;
    const userId = req.user._id;

    if (!data) {
      return res.status(400).json({ message: 'Backup data is required' });
    }

    // Import labels first (they might be referenced by tasks)
    if (data.labels && Array.isArray(data.labels)) {
      for (const label of data.labels) {
        await Label.findOneAndUpdate(
          { name: label.name, createdBy: userId },
          { ...label, createdBy: userId, _id: undefined },
          { upsert: true, new: true }
        );
      }
    }

    // Import projects
    const projectMap = new Map();
    if (data.projects && Array.isArray(data.projects)) {
      for (const project of data.projects) {
        const newProject = await Project.findOneAndUpdate(
          { name: project.name, owner: userId },
          { ...project, owner: userId, members: [{ user: userId, role: 'admin' }], _id: undefined },
          { upsert: true, new: true }
        );
        if (project._id) {
          projectMap.set(project._id.toString(), newProject._id.toString());
        }
      }
    }

    // Import lists
    const listMap = new Map();
    if (data.lists && Array.isArray(data.lists)) {
      for (const list of data.lists) {
        const projectId = list.project && projectMap.get(list.project.toString());
        const newList = await List.findOneAndUpdate(
          { name: list.name, owner: userId },
          {
            ...list,
            owner: userId,
            project: projectId || null,
            members: [{ user: userId, role: 'admin' }],
            _id: undefined
          },
          { upsert: true, new: true }
        );
        if (list._id) {
          listMap.set(list._id.toString(), newList._id.toString());
        }
      }
    }

    // Import tasks
    if (data.tasks && Array.isArray(data.tasks)) {
      for (const task of data.tasks) {
        const listId = task.list && listMap.get(task.list.toString());
        const projectId = task.project && projectMap.get(task.project.toString());
        
        if (listId) {
          await Task.findOneAndUpdate(
            { title: task.title, list: listId, createdBy: userId },
            {
              ...task,
              list: listId,
              project: projectId || null,
              createdBy: userId,
              assignedTo: [userId], // Reset assignments
              _id: undefined
            },
            { upsert: true, new: true }
          );
        }
      }
    }

    res.json({ message: 'Backup imported successfully' });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
