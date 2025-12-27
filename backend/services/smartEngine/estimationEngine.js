/**
 * ============================================
 * SMART ENGINE - TIME ESTIMATION ENGINE
 * Estimates task duration based on historical data
 * ============================================
 */

const { buildExplanation } = require('./explanation');
const { loadConfig } = require('./config');

/**
 * Estimate time for a task based on historical data
 * @param {Object} taskSnapshot - TaskSnapshot object
 * @param {Object[]} historicalTasks - Array of completed TaskSnapshot objects
 * @param {Object} userSnapshot - UserSnapshot for assignee (optional)
 * @param {Object} projectSnapshot - ProjectSnapshot (optional)
 * @param {Object} config - Configuration object (optional)
 * @returns {Object} { estimatedMinutes, confidenceLevel, basedOn, explanation }
 */
function estimateTime(taskSnapshot, historicalTasks = [], userSnapshot = null, projectSnapshot = null, config = null) {
  if (!config) {
    config = loadConfig(projectSnapshot?.settings);
  }

  // Find similar completed tasks
  const similarTasks = findSimilarTasks(taskSnapshot, historicalTasks, userSnapshot, projectSnapshot);

  if (similarTasks.length < config.estimation.minSamples) {
    // Not enough samples - use fallback
    return getFallbackEstimate(taskSnapshot, userSnapshot, projectSnapshot, config);
  }

  // Extract time values
  const times = similarTasks
    .map(t => t.actualTime)
    .filter(t => t !== null && t > 0)
    .sort((a, b) => a - b);

  if (times.length === 0) {
    return getFallbackEstimate(taskSnapshot, userSnapshot, projectSnapshot, config);
  }

  // Calculate estimate
  let estimatedMinutes;
  if (config.estimation.useMedian) {
    // Use median
    const mid = Math.floor(times.length / 2);
    estimatedMinutes = times.length % 2 === 0
      ? (times[mid - 1] + times[mid]) / 2
      : times[mid];
  } else {
    // Use mean
    estimatedMinutes = times.reduce((sum, t) => sum + t, 0) / times.length;
  }

  // Calculate confidence
  const confidenceLevel = calculateConfidence(times.length, similarTasks.length, config);

  // Determine what the estimate is based on
  const basedOn = [];
  if (taskSnapshot.labels.length > 0) {
    basedOn.push(`label:${taskSnapshot.labels[0]}`);
  }
  if (taskSnapshot.projectId) {
    basedOn.push(`project:${taskSnapshot.projectId}`);
  }
  if (userSnapshot) {
    basedOn.push(`assignee:${userSnapshot.id}`);
  }

  const factors = [
    {
      factor: 'estimate',
      value: estimatedMinutes,
      impact: `${Math.round(estimatedMinutes)} minutes`
    },
    {
      factor: 'confidence',
      value: confidenceLevel,
      impact: confidenceLevel >= 0.8 ? 'high' : confidenceLevel >= 0.5 ? 'medium' : 'low'
    },
    {
      factor: 'basedOn',
      value: basedOn,
      impact: basedOn.join(', ')
    }
  ];

  const explanation = buildExplanation('estimate', factors);

  return {
    estimatedMinutes: Math.round(estimatedMinutes),
    confidenceLevel,
    basedOn,
    explanation,
    sampleSize: similarTasks.length
  };
}

/**
 * Find similar completed tasks
 * @param {Object} taskSnapshot - TaskSnapshot to find similar tasks for
 * @param {Object[]} historicalTasks - Array of completed TaskSnapshot objects
 * @param {Object} userSnapshot - UserSnapshot (optional)
 * @param {Object} projectSnapshot - ProjectSnapshot (optional)
 * @returns {Object[]} Array of similar TaskSnapshot objects
 */
function findSimilarTasks(taskSnapshot, historicalTasks, userSnapshot, projectSnapshot) {
  return historicalTasks.filter(historical => {
    // Must be completed
    if (!historical.done || !historical.actualTime) {
      return false;
    }

    let similarityScore = 0;
    let maxScore = 0;

    // Match by labels (weight: 3)
    if (taskSnapshot.labels.length > 0 && historical.labels.length > 0) {
      const commonLabels = taskSnapshot.labels.filter(l => historical.labels.includes(l));
      if (commonLabels.length > 0) {
        similarityScore += 3;
      }
      maxScore += 3;
    }

    // Match by project (weight: 2)
    if (taskSnapshot.projectId && historical.projectId === taskSnapshot.projectId) {
      similarityScore += 2;
      maxScore += 2;
    }

    // Match by assignee (weight: 2)
    if (userSnapshot && historical.assignees.includes(userSnapshot.id)) {
      similarityScore += 2;
      maxScore += 2;
    }

    // Match by priority (weight: 1)
    if (Math.abs(taskSnapshot.priority - historical.priority) <= 1) {
      similarityScore += 1;
      maxScore += 1;
    }

    // Require at least 50% similarity
    return maxScore > 0 && (similarityScore / maxScore) >= 0.5;
  });
}

/**
 * Get fallback estimate when not enough historical data
 * @param {Object} taskSnapshot - TaskSnapshot
 * @param {Object} userSnapshot - UserSnapshot (optional)
 * @param {Object} projectSnapshot - ProjectSnapshot (optional)
 * @param {Object} config - Configuration
 * @returns {Object}
 */
function getFallbackEstimate(taskSnapshot, userSnapshot, projectSnapshot, config) {
  let estimatedMinutes = 60; // Default: 1 hour

  // Try user's historical average by label
  if (userSnapshot && taskSnapshot.labels.length > 0) {
    const labelId = taskSnapshot.labels[0];
    if (userSnapshot.historicalAverageByLabel[labelId]) {
      estimatedMinutes = userSnapshot.historicalAverageByLabel[labelId];
    }
  }

  // Try user's historical average by project
  if (userSnapshot && taskSnapshot.projectId) {
    if (userSnapshot.historicalAverageByProject[taskSnapshot.projectId]) {
      estimatedMinutes = userSnapshot.historicalAverageByProject[taskSnapshot.projectId];
    }
  }

  // Apply fallback multiplier
  estimatedMinutes = estimatedMinutes * config.estimation.fallbackMultiplier;

  const factors = [
    {
      factor: 'estimate',
      value: estimatedMinutes,
      impact: `${Math.round(estimatedMinutes)} minutes`
    },
    {
      factor: 'confidence',
      value: 0.3,
      impact: 'low (fallback estimate)'
    },
    {
      factor: 'basedOn',
      value: ['fallback'],
      impact: 'default estimate'
    }
  ];

  const explanation = buildExplanation('estimate', factors);

  return {
    estimatedMinutes: Math.round(estimatedMinutes),
    confidenceLevel: 0.3,
    basedOn: ['fallback'],
    explanation,
    sampleSize: 0
  };
}

/**
 * Calculate confidence level
 * @param {number} sampleSize - Number of samples used
 * @param {number} totalSimilar - Total similar tasks found
 * @param {Object} config - Configuration
 * @returns {number} Confidence level (0-1)
 */
function calculateConfidence(sampleSize, totalSimilar, config) {
  // Base confidence on sample size
  let confidence = Math.min(1, sampleSize / 10); // Max confidence at 10+ samples

  // Adjust based on total similar tasks found
  if (totalSimilar > sampleSize) {
    confidence *= 0.9; // Slightly lower if we filtered some out
  }

  return Math.max(0, Math.min(1, confidence));
}

module.exports = {
  estimateTime,
  findSimilarTasks,
  getFallbackEstimate
};
