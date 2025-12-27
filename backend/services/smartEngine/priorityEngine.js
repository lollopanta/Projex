/**
 * ============================================
 * SMART ENGINE - PRIORITY ENGINE
 * Calculates priority scores for tasks based on multiple factors
 * ============================================
 */

const { buildExplanation, formatScore } = require('./explanation');
const { loadConfig } = require('./config');

/**
 * Calculate priority score for a task
 * @param {Object} taskSnapshot - TaskSnapshot object
 * @param {Object} projectSnapshot - ProjectSnapshot object (optional)
 * @param {Object[]} userSnapshots - Array of UserSnapshot objects for assignees
 * @param {Date} currentDate - Current date/time (defaults to now)
 * @param {Object} config - Configuration object (optional)
 * @returns {Object} { taskId, priorityScore, reasons: string[] }
 */
function calculatePriority(taskSnapshot, projectSnapshot = null, userSnapshots = [], currentDate = new Date(), config = null, options = {}) {
  if (!config) {
    config = loadConfig(projectSnapshot?.settings);
  }

  const weights = config.priority.weights;
  const factors = [];
  let totalScore = 0;

  // Factor 1: Urgency (due date proximity)
  const urgencyScore = calculateUrgency(taskSnapshot, currentDate, config);
  totalScore += urgencyScore * weights.urgency;
  
  // Calculate actual days until due for factor value
  let daysUntilDue = null;
  if (taskSnapshot.dueDate && !taskSnapshot.done) {
    const dueDateUTC = new Date(taskSnapshot.dueDate).getTime();
    const currentDateUTC = new Date(currentDate).getTime();
    const diffInMs = dueDateUTC - currentDateUTC;
    daysUntilDue = diffInMs / (1000 * 60 * 60 * 24);
  }
  
  factors.push({
    factor: 'urgency',
    value: daysUntilDue !== null ? daysUntilDue : urgencyScore,
    impact: urgencyScore > 0 ? 'positive' : urgencyScore < 0 ? 'negative' : 'neutral'
  });

  // Factor 2: Overdue penalty
  if (taskSnapshot.dueDate && !taskSnapshot.done) {
    // Ensure both dates are in UTC for accurate calculation
    const dueDateUTC = new Date(taskSnapshot.dueDate).getTime();
    const currentDateUTC = new Date(currentDate).getTime();
    const diffInMs = currentDateUTC - dueDateUTC;
    
    if (diffInMs > 0) {
      // Task is overdue
      const daysOverdue = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      const overdueScore = daysOverdue * config.priority.overduePenalty;
      totalScore += overdueScore * weights.overdue;
      factors.push({
        factor: 'overdue',
        value: daysOverdue,
        impact: `overdue by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}`
      });
    }
  }

  // Factor 3: Manual priority
  const manualPriorityScore = (taskSnapshot.priority - 3) * 2; // Convert 1-5 to -4 to +4
  totalScore += manualPriorityScore * weights.manualPriority;
  factors.push({
    factor: 'manualPriority',
    value: taskSnapshot.priority,
    impact: taskSnapshot.priority > 3 ? 'positive' : taskSnapshot.priority < 3 ? 'negative' : 'neutral'
  });

  // Factor 4: Blocking dependencies
  // Note: This requires checking if dependencies are completed
  // The blocking score is calculated based on incomplete dependencies
  // For now, we assume dependencies are checked externally and passed in options
  const incompleteDependencies = options.incompleteDependencies || taskSnapshot.dependencies?.length || 0;
  if (incompleteDependencies > 0) {
    const blockingScore = incompleteDependencies * 2;
    totalScore += blockingScore * weights.dependencies;
    factors.push({
      factor: 'blocking',
      value: incompleteDependencies,
      impact: `blocks ${incompleteDependencies} task${incompleteDependencies !== 1 ? 's' : ''}`
    });
  }

  // Factor 5: Completion percentage (incomplete tasks get higher priority)
  const completionScore = (100 - taskSnapshot.percentDone) / 100;
  totalScore += completionScore * weights.completion;
  factors.push({
    factor: 'completion',
    value: taskSnapshot.percentDone,
    impact: taskSnapshot.percentDone < 50 ? 'positive' : 'neutral'
  });

  // Factor 6: Assignee workload
  if (taskSnapshot.assignees.length > 0 && userSnapshots.length > 0) {
    const workloadScore = calculateWorkloadFactor(taskSnapshot.assignees, userSnapshots, config);
    totalScore += workloadScore * weights.workload;
    factors.push({
      factor: 'workload',
      value: workloadScore,
      impact: workloadScore > 1 ? 'negative' : 'positive'
    });
  }

  // Normalize score to 0-100 range (approximate)
  const normalizedScore = Math.max(0, Math.min(100, totalScore + 50));

  // Build explanation
  const explanation = buildExplanation('priority', factors);

  return {
    taskId: taskSnapshot.id,
    priorityScore: Math.round(normalizedScore),
    reasons: factors
      .filter(f => f.impact !== 'neutral')
      .map(f => {
        if (f.factor === 'urgency') {
          // Calculate actual days from due date for display
          if (taskSnapshot.dueDate && !taskSnapshot.done) {
            const dueDateUTC = new Date(taskSnapshot.dueDate).getTime();
            const currentDateUTC = new Date(currentDate).getTime();
            const diffInMs = dueDateUTC - currentDateUTC;
            const days = diffInMs / (1000 * 60 * 60 * 24);
            
            if (days < 0) return `Overdue by ${Math.abs(Math.floor(days))} day${Math.abs(Math.floor(days)) !== 1 ? 's' : ''}`;
            if (days < 1) return 'Due today';
            if (days < 2) return 'Due tomorrow';
            return `Due in ${Math.floor(days)} day${Math.floor(days) !== 1 ? 's' : ''}`;
          }
          return f.impact;
        }
        return f.impact;
      }),
    explanation,
    factors
  };
}

/**
 * Calculate urgency score based on due date
 * @param {Object} taskSnapshot - TaskSnapshot
 * @param {Date} currentDate - Current date
 * @param {Object} config - Configuration
 * @returns {number}
 */
function calculateUrgency(taskSnapshot, currentDate, config) {
  if (!taskSnapshot.dueDate || taskSnapshot.done) {
    return 0;
  }

  // Ensure both dates are in UTC for accurate calculation
  const dueDateUTC = new Date(taskSnapshot.dueDate).getTime();
  const currentDateUTC = new Date(currentDate).getTime();
  const diffInMs = dueDateUTC - currentDateUTC;
  const daysUntilDue = diffInMs / (1000 * 60 * 60 * 24);

  if (daysUntilDue < 0) {
    // Overdue - handled separately
    return 0;
  }

  // Exponential decay: urgency decreases as days increase
  // Tasks due today = 10, tomorrow = 9, etc.
  const baseUrgency = 10;
  const decay = config.priority.urgencyDecay;
  const urgency = baseUrgency * Math.exp(-decay * daysUntilDue);

  return urgency;
}

/**
 * Calculate workload factor for assignees
 * @param {string[]} assigneeIds - Array of assignee IDs
 * @param {Object[]} userSnapshots - Array of UserSnapshot objects
 * @param {Object} config - Configuration
 * @returns {number} - Factor > 1 means overloaded, < 1 means available
 */
function calculateWorkloadFactor(assigneeIds, userSnapshots, config) {
  if (assigneeIds.length === 0 || userSnapshots.length === 0) {
    return 1; // Neutral if no assignees
  }

  // For now, use average workload of all assignees
  // In a more sophisticated version, you'd calculate actual current workload
  const assignees = userSnapshots.filter(u => assigneeIds.includes(u.id));
  
  if (assignees.length === 0) {
    return 1;
  }

  // Placeholder: in real implementation, calculate actual workload
  // For now, return neutral
  return 1;
}

/**
 * Calculate priorities for multiple tasks
 * @param {Object[]} taskSnapshots - Array of TaskSnapshot objects
 * @param {Object} projectSnapshot - ProjectSnapshot (optional)
 * @param {Object[]} userSnapshots - Array of UserSnapshot objects
 * @param {Date} currentDate - Current date
 * @param {Object} config - Configuration
 * @returns {Object[]} Array of priority results
 */
function calculatePriorities(taskSnapshots, projectSnapshot = null, userSnapshots = [], currentDate = new Date(), config = null) {
  return taskSnapshots.map(task => 
    calculatePriority(task, projectSnapshot, userSnapshots, currentDate, config)
  ).sort((a, b) => b.priorityScore - a.priorityScore); // Sort by priority (highest first)
}

module.exports = {
  calculatePriority,
  calculatePriorities,
  calculateUrgency,
  calculateWorkloadFactor
};
