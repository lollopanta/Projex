const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  },
  position: {
    type: Number,
    default: 0
  }
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  list: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  kanbanColumnId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project.kanbanColumns',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  labels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Label'
  }],
  dueDate: {
    type: Date,
    default: null
  },
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'push'],
      default: 'email'
    },
    timeBefore: {
      type: Number, // hours before deadline
      required: true
    },
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: {
      type: Date,
      default: null
    }
  }],
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  },
  subtasks: [subtaskSchema],
  position: {
    type: Number,
    default: 0
  },
  // Recurring task configuration
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
      default: null
    },
    interval: {
      type: Number,
      default: 1 // e.g., every 2 weeks
    },
    daysOfWeek: [{
      type: Number, // 0-6 (Sunday-Saturday)
    }],
    dayOfMonth: {
      type: Number, // 1-31
    },
    endDate: {
      type: Date,
      default: null
    },
    nextDueDate: {
      type: Date,
      default: null
    }
  },
  parentTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  // Task dependencies: this task depends on tasks in this array
  // If task A has task B in dependencies, then A → B means A is blocked by B
  // Direction: dependencies array contains tasks that THIS task depends on
  dependencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    validate: {
      validator: function(v) {
        // Prevent self-dependency
        return !this._id || v.toString() !== this._id.toString();
      },
      message: 'A task cannot depend on itself'
    }
  }],
  attachments: [{
    filename: String,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  googleCalendarEventId: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

taskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.completed && !this.completedAt) {
    this.completedAt = Date.now();
  }
  if (!this.completed && this.completedAt) {
    this.completedAt = null;
  }
  next();
});

// Indexes for better query performance
taskSchema.index({ list: 1, position: 1 });
taskSchema.index({ project: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ completed: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ dependencies: 1 }); // For dependency queries

module.exports = mongoose.model('Task', taskSchema);
