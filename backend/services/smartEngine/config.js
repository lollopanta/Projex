/**
 * ============================================
 * SMART ENGINE - CONFIGURATION
 * Configurable heuristics and weights for Smart Engine
 * ============================================
 */

/**
 * Default configuration for Smart Engine
 */
const defaultConfig = {
  priority: {
    weights: {
      urgency: 3,        // Weight for due date urgency
      dependencies: 5,   // Weight for blocking dependencies
      overdue: 10,      // Weight for overdue tasks
      manualPriority: 4, // Weight for manual priority setting
      completion: 2,     // Weight for completion percentage
      workload: 3        // Weight for assignee workload
    },
    urgencyDecay: 0.1,  // How quickly urgency decreases per day
    overduePenalty: 2    // Multiplier for overdue tasks
  },

  workload: {
    overloadThreshold: 1.0,      // 100% capacity = overload
    underutilizedThreshold: 0.3, // 30% capacity = underutilized
    warningThreshold: 0.9       // 90% capacity = warning
  },

  estimation: {
    minSamples: 3,              // Minimum samples for reliable estimate
    useMedian: true,             // Use median instead of mean
    confidenceThresholds: {
      high: 0.8,                 // High confidence threshold
      medium: 0.5,               // Medium confidence threshold
      low: 0.0                   // Low confidence threshold
    },
    fallbackMultiplier: 1.5      // Multiplier for fallback estimates
  },

  duplication: {
    similarityThreshold: 0.7,    // Jaccard similarity threshold
    minTokens: 3,                // Minimum tokens for comparison
    normalizeTitle: true         // Normalize titles before comparison
  },

  dependency: {
    maxDepth: 10,                // Maximum depth for dependency traversal
    criticalPathWeight: 2        // Weight for critical path tasks
  }
};

/**
 * Load configuration from project settings or use defaults
 * @param {Object} projectSettings - Project-specific settings
 * @returns {Object}
 */
function loadConfig(projectSettings = {}) {
  const config = JSON.parse(JSON.stringify(defaultConfig)); // Deep clone

  // Merge project-specific settings if provided
  if (projectSettings.smartEngine) {
    if (projectSettings.smartEngine.priority) {
      Object.assign(config.priority.weights, projectSettings.smartEngine.priority.weights || {});
    }
    if (projectSettings.smartEngine.workload) {
      Object.assign(config.workload, projectSettings.smartEngine.workload);
    }
    if (projectSettings.smartEngine.estimation) {
      Object.assign(config.estimation, projectSettings.smartEngine.estimation);
    }
  }

  return config;
}

module.exports = {
  defaultConfig,
  loadConfig
};
