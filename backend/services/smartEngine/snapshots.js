/**
 * ============================================
 * SMART ENGINE - SNAPSHOTS
 * Immutable data structures for Smart Engine processing
 * ============================================
 */

/**
 * TaskSnapshot - Normalized, immutable representation of a task
 * @typedef {Object} TaskSnapshot
 * @property {string} id
 * @property {string} title
 * @property {string|null} projectId
 * @property {string[]} assignees - Array of user IDs
 * @property {string[]} labels - Array of label IDs
 * @property {number} priority - 1-5 (1=lowest, 5=highest)
 * @property {number} percentDone - 0-100
 * @property {number|null} estimatedTime - Minutes
 * @property {number|null} actualTime - Minutes
 * @property {Date|null} dueDate
 * @property {Date|null} startDate
 * @property {Date|null} endDate
 * @property {boolean} done
 * @property {Date|null} doneAt
 * @property {string[]} dependencies - Array of task IDs
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * UserSnapshot - Normalized user data for capacity analysis
 * @typedef {Object} UserSnapshot
 * @property {string} id
 * @property {string} name
 * @property {number} weeklyCapacity - Minutes per week
 * @property {Object<string, number>} historicalAverageByLabel - Label ID -> average minutes
 * @property {Object<string, number>} historicalAverageByProject - Project ID -> average minutes
 * @property {Object<string, number>} availabilityByDay - Day name -> minutes (Mon-Sun)
 */

/**
 * ProjectSnapshot - Normalized project data
 * @typedef {Object} ProjectSnapshot
 * @property {string} id
 * @property {string} name
 * @property {string[]} taskIds - Array of task IDs in this project
 * @property {Date|null} startDate
 * @property {Date|null} endDate
 * @property {number[]} workingDays - Array of day numbers (0=Sunday, 6=Saturday)
 * @property {Object} settings - Project-specific settings
 */

/**
 * Convert a Mongoose Task document to TaskSnapshot
 * @param {Object} task - Mongoose task document
 * @returns {TaskSnapshot}
 */
function taskToSnapshot(task) {
  // Convert priority string to number (1-5)
  const priorityMap = {
    'low': 1,
    'medium': 3,
    'high': 5
  };

  return {
    id: task._id.toString(),
    title: task.title || '',
    projectId: task.project ? task.project.toString() : null,
    assignees: (task.assignedTo || []).map(id => 
      typeof id === 'object' ? id._id.toString() : id.toString()
    ),
    labels: (task.labels || []).map(id => 
      typeof id === 'object' ? id._id.toString() : id.toString()
    ),
    priority: priorityMap[task.priority] || 3,
    percentDone: task.percentDone || (task.completed ? 100 : 0),
    estimatedTime: task.estimatedTime || null,
    actualTime: task.actualTime || null,
    dueDate: task.dueDate || null,
    startDate: task.startDate || null,
    endDate: task.endDate || null,
    done: task.completed || false,
    doneAt: task.completedAt || null,
    dependencies: (task.dependencies || []).map(id => 
      typeof id === 'object' ? id._id.toString() : id.toString()
    ),
    createdAt: task.createdAt || new Date(),
    updatedAt: task.updatedAt || new Date()
  };
}

/**
 * Convert a Mongoose User document to UserSnapshot
 * @param {Object} user - Mongoose user document
 * @param {Object} options - Additional data
 * @param {Object} options.historicalAverages - Historical time averages
 * @param {Object} options.availability - Day availability
 * @returns {UserSnapshot}
 */
function userToSnapshot(user, options = {}) {
  return {
    id: user._id.toString(),
    name: user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user.username,
    weeklyCapacity: (user.weeklyCapacity || 40 * 60) * 60, // Default 40 hours/week in minutes
    historicalAverageByLabel: options.historicalAverages?.byLabel || {},
    historicalAverageByProject: options.historicalAverages?.byProject || {},
    availabilityByDay: options.availability || {
      'Monday': 8 * 60,
      'Tuesday': 8 * 60,
      'Wednesday': 8 * 60,
      'Thursday': 8 * 60,
      'Friday': 8 * 60,
      'Saturday': 0,
      'Sunday': 0
    }
  };
}

/**
 * Convert a Mongoose Project document to ProjectSnapshot
 * @param {Object} project - Mongoose project document
 * @param {string[]} taskIds - Array of task IDs in this project
 * @returns {ProjectSnapshot}
 */
function projectToSnapshot(project, taskIds = []) {
  return {
    id: project._id.toString(),
    name: project.name || '',
    taskIds: taskIds,
    startDate: project.startDate || null,
    endDate: project.endDate || null,
    workingDays: project.workingDays || [1, 2, 3, 4, 5], // Default Mon-Fri
    settings: project.settings || {}
  };
}

module.exports = {
  taskToSnapshot,
  userToSnapshot,
  projectToSnapshot
};
