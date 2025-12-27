/**
 * ============================================
 * SMART ENGINE - WORKLOAD & CAPACITY ENGINE
 * Analyzes user workload and capacity
 * ============================================
 */

const { buildExplanation } = require('./explanation');
const { loadConfig } = require('./config');

/**
 * Calculate workload for a user
 * @param {Object} userSnapshot - UserSnapshot object
 * @param {Object[]} taskSnapshots - Array of TaskSnapshot objects assigned to this user
 * @param {Object} config - Configuration object (optional)
 * @returns {Object} { userId, weeklyLoad, capacity, status, warnings, suggestions }
 */
function calculateWorkload(userSnapshot, taskSnapshots = [], config = null) {
  if (!config) {
    config = loadConfig();
  }

  const capacity = userSnapshot.weeklyCapacity;
  
  // Calculate total estimated time for assigned tasks
  const assignedTasks = taskSnapshots.filter(t => 
    !t.done && t.assignees.includes(userSnapshot.id)
  );

  const weeklyLoad = assignedTasks.reduce((total, task) => {
    return total + (task.estimatedTime || 0);
  }, 0);

  const loadPercentage = capacity > 0 ? weeklyLoad / capacity : 0;
  const status = determineWorkloadStatus(loadPercentage, config);

  const factors = [
    {
      factor: 'status',
      value: status,
      impact: status
    },
    {
      factor: 'load',
      value: weeklyLoad,
      impact: `${weeklyLoad} minutes`
    },
    {
      factor: 'capacity',
      value: capacity,
      impact: `${capacity} minutes per week`
    }
  ];

  const warnings = [];
  const suggestions = [];

  if (status === 'overload') {
    warnings.push(`User is overloaded: ${Math.round(loadPercentage * 100)}% capacity used`);
    suggestions.push('Consider reassigning some tasks or extending deadlines');
  } else if (status === 'warning') {
    warnings.push(`User is approaching capacity: ${Math.round(loadPercentage * 100)}% capacity used`);
  } else if (status === 'underutilized') {
    suggestions.push(`User is underutilized: ${Math.round(loadPercentage * 100)}% capacity used. Consider assigning more tasks.`);
  }

  const explanation = buildExplanation('workload', factors);

  return {
    userId: userSnapshot.id,
    userName: userSnapshot.name,
    weeklyLoad,
    capacity,
    loadPercentage: Math.round(loadPercentage * 100),
    status,
    warnings,
    suggestions,
    explanation,
    assignedTaskCount: assignedTasks.length
  };
}

/**
 * Determine workload status
 * @param {number} loadPercentage - Load as percentage of capacity (0-1)
 * @param {Object} config - Configuration
 * @returns {string} 'overload' | 'warning' | 'balanced' | 'underutilized'
 */
function determineWorkloadStatus(loadPercentage, config) {
  if (loadPercentage >= config.workload.overloadThreshold) {
    return 'overload';
  } else if (loadPercentage >= config.workload.warningThreshold) {
    return 'warning';
  } else if (loadPercentage <= config.workload.underutilizedThreshold) {
    return 'underutilized';
  }
  return 'balanced';
}

/**
 * Calculate workload for multiple users
 * @param {Object[]} userSnapshots - Array of UserSnapshot objects
 * @param {Object[]} taskSnapshots - Array of TaskSnapshot objects
 * @param {Object} config - Configuration
 * @returns {Object[]} Array of workload results
 */
function calculateWorkloads(userSnapshots, taskSnapshots = [], config = null) {
  return userSnapshots.map(user => 
    calculateWorkload(user, taskSnapshots, config)
  );
}

/**
 * Get workload heatmap data
 * @param {Object[]} workloadResults - Array of workload calculation results
 * @returns {Object} Heatmap-ready data
 */
function getWorkloadHeatmap(workloadResults) {
  return workloadResults.map(result => ({
    userId: result.userId,
    userName: result.userName,
    loadPercentage: result.loadPercentage,
    status: result.status,
    color: getStatusColor(result.status)
  }));
}

/**
 * Get color for workload status
 * @param {string} status - Workload status
 * @returns {string} Color code
 */
function getStatusColor(status) {
  const colors = {
    'overload': '#EF4444',      // Red
    'warning': '#F59E0B',       // Amber
    'balanced': '#22C55E',      // Green
    'underutilized': '#6B7280'  // Gray
  };
  return colors[status] || '#6B7280';
}

module.exports = {
  calculateWorkload,
  calculateWorkloads,
  getWorkloadHeatmap,
  determineWorkloadStatus
};
