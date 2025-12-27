/**
 * ============================================
 * SMART ENGINE - MAIN MODULE
 * Central entry point for all Smart Engine functionality
 * ============================================
 */

const priorityEngine = require('./priorityEngine');
const workloadEngine = require('./workloadEngine');
const estimationEngine = require('./estimationEngine');
const duplicationEngine = require('./duplicationEngine');
const dependencyService = require('../dependencyService');
const { taskToSnapshot, userToSnapshot, projectToSnapshot } = require('./snapshots');
const { loadConfig } = require('./config');

/**
 * Smart Engine main service
 */
class SmartEngine {
  /**
   * Calculate priority for a task
   * @param {Object} task - Mongoose task document
   * @param {Object} project - Mongoose project document (optional)
   * @param {Object[]} users - Array of Mongoose user documents
   * @param {Object} options - Additional options
   * @returns {Object} Priority result
   */
  static async calculatePriority(task, project = null, users = [], options = {}) {
    const taskSnapshot = taskToSnapshot(task);
    const projectSnapshot = project ? projectToSnapshot(project, []) : null;
    const userSnapshots = users.map(u => userToSnapshot(u));
    const config = loadConfig(project?.settings);

    // Check dependency completion if not provided
    let incompleteDependencies = options.incompleteDependencies;
    if (incompleteDependencies === undefined && task.dependencies && task.dependencies.length > 0) {
      const dependencyService = require('../dependencyService');
      const isBlocked = await dependencyService.isTaskBlocked(task);
      // Count incomplete dependencies
      if (task.dependencies[0] && typeof task.dependencies[0] === 'object' && 'completed' in task.dependencies[0]) {
        incompleteDependencies = task.dependencies.filter(dep => !dep.completed).length;
      } else {
        // Need to fetch dependencies
        const Task = require('../../models/Task');
        const deps = await Task.find({ _id: { $in: task.dependencies } }).select('completed');
        incompleteDependencies = deps.filter(dep => !dep.completed).length;
      }
    }

    return priorityEngine.calculatePriority(
      taskSnapshot,
      projectSnapshot,
      userSnapshots,
      options.currentDate || new Date(),
      config,
      { incompleteDependencies }
    );
  }

  /**
   * Calculate priorities for multiple tasks
   * @param {Object[]} tasks - Array of Mongoose task documents
   * @param {Object} project - Mongoose project document (optional)
   * @param {Object[]} users - Array of Mongoose user documents
   * @param {Object} options - Additional options
   * @returns {Object[]} Array of priority results
   */
  static async calculatePriorities(tasks, project = null, users = [], options = {}) {
    const taskSnapshots = tasks.map(taskToSnapshot);
    const projectSnapshot = project ? projectToSnapshot(project, tasks.map(t => t._id.toString())) : null;
    const userSnapshots = users.map(u => userToSnapshot(u));
    const config = loadConfig(project?.settings);

    return priorityEngine.calculatePriorities(
      taskSnapshots,
      projectSnapshot,
      userSnapshots,
      options.currentDate || new Date(),
      config
    );
  }

  /**
   * Calculate workload for a user
   * @param {Object} user - Mongoose user document
   * @param {Object[]} tasks - Array of Mongoose task documents
   * @param {Object} options - Additional options
   * @returns {Object} Workload result
   */
  static async calculateWorkload(user, tasks = [], options = {}) {
    const userSnapshot = userToSnapshot(user, {
      historicalAverages: options.historicalAverages,
      availability: options.availability
    });
    const taskSnapshots = tasks.map(taskToSnapshot);
    const config = loadConfig();

    return workloadEngine.calculateWorkload(userSnapshot, taskSnapshots, config);
  }

  /**
   * Calculate workloads for multiple users
   * @param {Object[]} users - Array of Mongoose user documents
   * @param {Object[]} tasks - Array of Mongoose task documents
   * @param {Object} options - Additional options
   * @returns {Object[]} Array of workload results
   */
  static async calculateWorkloads(users, tasks = [], options = {}) {
    const userSnapshots = users.map(u => userToSnapshot(u, {
      historicalAverages: options.historicalAverages?.[u._id.toString()],
      availability: options.availability?.[u._id.toString()]
    }));
    const taskSnapshots = tasks.map(taskToSnapshot);
    const config = loadConfig();

    return workloadEngine.calculateWorkloads(userSnapshots, taskSnapshots, config);
  }

  /**
   * Estimate time for a task
   * @param {Object} task - Mongoose task document
   * @param {Object[]} historicalTasks - Array of completed Mongoose task documents
   * @param {Object} user - Mongoose user document (optional)
   * @param {Object} project - Mongoose project document (optional)
   * @param {Object} options - Additional options
   * @returns {Object} Estimation result
   */
  static async estimateTime(task, historicalTasks = [], user = null, project = null, options = {}) {
    const taskSnapshot = taskToSnapshot(task);
    const historicalSnapshots = historicalTasks.map(taskToSnapshot);
    const userSnapshot = user ? userToSnapshot(user) : null;
    const projectSnapshot = project ? projectToSnapshot(project, []) : null;
    const config = loadConfig(project?.settings);

    return estimationEngine.estimateTime(
      taskSnapshot,
      historicalSnapshots,
      userSnapshot,
      projectSnapshot,
      config
    );
  }

  /**
   * Detect duplicate tasks
   * @param {Object[]} tasks - Array of Mongoose task documents
   * @param {Object} project - Mongoose project document (optional)
   * @param {Object} options - Additional options
   * @returns {Object[]} Array of duplicate detection results
   */
  static async detectDuplicates(tasks, project = null, options = {}) {
    const taskSnapshots = tasks.map(taskToSnapshot);
    const config = loadConfig(project?.settings);

    return duplicationEngine.detectDuplicates(taskSnapshots, config);
  }

  /**
   * Analyze dependencies and get impact
   * @param {string} taskId - Task ID
   * @param {Object} options - Additional options
   * @returns {Object} Dependency impact analysis
   */
  static async analyzeDependencyImpact(taskId, options = {}) {
    const impact = await dependencyService.getImpactedTasks(taskId);
    
    const factors = [
      {
        factor: 'impact',
        value: impact.all.length > 0 ? 'high' : 'none',
        impact: impact.all.length > 0 ? 'high' : 'none'
      },
      {
        factor: 'affectedTasks',
        value: impact.all.length,
        impact: `${impact.all.length} task${impact.all.length !== 1 ? 's' : ''}`
      }
    ];

    return {
      taskId,
      direct: impact.direct,
      indirect: impact.indirect,
      all: impact.all,
      totalAffected: impact.all.length,
      factors
    };
  }
}

module.exports = SmartEngine;
