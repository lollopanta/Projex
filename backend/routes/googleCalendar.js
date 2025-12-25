const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const Task = require('../models/Task');
const {
  getAuthUrl,
  getTokens,
  createCalendarEvent,
  deleteCalendarEvent
} = require('../services/googleCalendarService');

// @route   GET /api/google-calendar/auth
// @desc    Get Google Calendar authorization URL
// @access  Private
router.get('/auth', authenticate, (req, res) => {
  try {
    const authUrl = getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/google-calendar/callback
// @desc    Handle Google OAuth callback
// @access  Private
router.get('/callback', authenticate, async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ message: 'Authorization code is required' });
    }

    const tokens = await getTokens(code);
    const user = await User.findById(req.user._id);

    user.googleCalendarAccessToken = tokens.access_token;
    user.googleCalendarRefreshToken = tokens.refresh_token;
    await user.save();

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?calendar=connected`);
  } catch (error) {
    console.error('Google Calendar callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?calendar=error`);
  }
});

// @route   POST /api/google-calendar/sync-task/:taskId
// @desc    Sync a task to Google Calendar
// @access  Private
router.post('/sync-task/:taskId', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.googleCalendarAccessToken) {
      return res.status(400).json({ message: 'Google Calendar not connected' });
    }

    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!task.dueDate) {
      return res.status(400).json({ message: 'Task must have a due date to sync' });
    }

    const event = await createCalendarEvent(task, user);
    
    // Store calendar event ID in task for future updates
    task.googleCalendarEventId = event.id;
    await task.save();

    res.json({ message: 'Task synced to Google Calendar', eventId: event.id });
  } catch (error) {
    console.error('Sync task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/google-calendar/unsync-task/:taskId
// @desc    Remove task from Google Calendar
// @access  Private
router.delete('/unsync-task/:taskId', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const task = await Task.findById(req.params.taskId);

    if (!task || !task.googleCalendarEventId) {
      return res.status(404).json({ message: 'Task or calendar event not found' });
    }

    await deleteCalendarEvent(task.googleCalendarEventId, user);
    
    task.googleCalendarEventId = null;
    await task.save();

    res.json({ message: 'Task removed from Google Calendar' });
  } catch (error) {
    console.error('Unsync task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/google-calendar/disconnect
// @desc    Disconnect Google Calendar
// @access  Private
router.delete('/disconnect', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.googleCalendarAccessToken = null;
    user.googleCalendarRefreshToken = null;
    await user.save();

    res.json({ message: 'Google Calendar disconnected' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
