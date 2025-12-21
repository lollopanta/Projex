const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Label = require('../models/Label');
const { authenticate } = require('../middleware/auth');

// @route   GET /api/labels
// @desc    Get all labels for user
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const labels = await Label.find({ createdBy: req.user._id }).sort({ name: 1 });
    res.json(labels);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/labels
// @desc    Create a new label
// @access  Private
router.post('/', authenticate, [
  body('name').trim().notEmpty().withMessage('Label name is required'),
  body('color').optional().isHexColor().withMessage('Valid color hex code is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, color } = req.body;

    // Check if label already exists for this user
    const existingLabel = await Label.findOne({ name, createdBy: req.user._id });
    if (existingLabel) {
      return res.status(400).json({ message: 'Label with this name already exists' });
    }

    const label = new Label({
      name,
      color: color || '#3B82F6',
      createdBy: req.user._id
    });

    await label.save();
    res.status(201).json(label);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/labels/:id
// @desc    Update a label
// @access  Private
router.put('/:id', authenticate, [
  body('name').optional().trim().notEmpty(),
  body('color').optional().isHexColor()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const label = await Label.findById(req.params.id);
    if (!label) {
      return res.status(404).json({ message: 'Label not found' });
    }

    if (label.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, color } = req.body;
    if (name) label.name = name;
    if (color) label.color = color;

    await label.save();
    res.json(label);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/labels/:id
// @desc    Delete a label
// @access  Private
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const label = await Label.findById(req.params.id);
    if (!label) {
      return res.status(404).json({ message: 'Label not found' });
    }

    if (label.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Label.deleteOne({ _id: label._id });
    res.json({ message: 'Label deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
