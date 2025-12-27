/**
 * ============================================
 * SMART ENGINE - EXPLANATION SYSTEM
 * Builds human-readable explanations for Smart Engine outputs
 * ============================================
 */

/**
 * Build a human-readable explanation from factors
 * @param {string} type - Type of explanation (priority, workload, estimate, etc.)
 * @param {Array<{factor: string, value: any, impact: string}>} factors - Array of contributing factors
 * @returns {string}
 */
function buildExplanation(type, factors) {
  if (!factors || factors.length === 0) {
    return 'No factors available.';
  }

  const explanations = {
    priority: () => {
      const reasons = factors
        .filter(f => f.impact !== 'neutral')
        .map(f => {
          if (f.factor === 'urgency') {
            const days = f.value;
            if (days < 0) {
              return `overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`;
            } else if (days === 0) {
              return 'due today';
            } else if (days <= 1) {
              return 'due tomorrow';
            } else {
              return `due in ${days} day${days !== 1 ? 's' : ''}`;
            }
          } else if (f.factor === 'blocking') {
            return `blocks ${f.value} task${f.value !== 1 ? 's' : ''}`;
          } else if (f.factor === 'manualPriority') {
            const levels = ['lowest', 'low', 'medium', 'high', 'highest'];
            return `manual priority: ${levels[f.value - 1] || 'medium'}`;
          } else if (f.factor === 'completion') {
            return `${f.value}% complete`;
          } else if (f.factor === 'workload') {
            return f.value > 1 ? 'assignee overloaded' : 'assignee available';
          }
          return f.impact;
        });

      if (reasons.length === 0) {
        return 'Standard priority based on default factors.';
      }

      return `High priority because: ${reasons.join(', ')}.`;
    },

    workload: () => {
      const status = factors.find(f => f.factor === 'status');
      const load = factors.find(f => f.factor === 'load');
      const capacity = factors.find(f => f.factor === 'capacity');

      if (status && load && capacity) {
        const percentage = Math.round((load.value / capacity.value) * 100);
        if (status.value === 'overload') {
          return `Overloaded: ${percentage}% capacity used (${load.value} min / ${capacity.value} min per week).`;
        } else if (status.value === 'underutilized') {
          return `Underutilized: ${percentage}% capacity used. Consider assigning more tasks.`;
        } else {
          return `Balanced workload: ${percentage}% capacity used.`;
        }
      }

      return 'Workload analysis completed.';
    },

    estimate: () => {
      const estimate = factors.find(f => f.factor === 'estimate');
      const confidence = factors.find(f => f.factor === 'confidence');
      const basedOn = factors.find(f => f.factor === 'basedOn');

      if (estimate && confidence) {
        const hours = Math.round(estimate.value / 60 * 10) / 10;
        const confLevel = confidence.value;
        let confText = '';
        
        if (confLevel >= 0.8) {
          confText = 'high confidence';
        } else if (confLevel >= 0.5) {
          confText = 'medium confidence';
        } else {
          confText = 'low confidence';
        }

        let basedOnText = '';
        if (basedOn && basedOn.value.length > 0) {
          basedOnText = ` based on ${basedOn.value.join(', ')}`;
        }

        return `Estimated ${hours} hour${hours !== 1 ? 's' : ''} (${confText}${basedOnText}).`;
      }

      return 'Time estimate calculated.';
    },

    dependency: () => {
      const impact = factors.find(f => f.factor === 'impact');
      const affected = factors.find(f => f.factor === 'affectedTasks');

      if (impact && affected) {
        return `If delayed, affects ${affected.value} task${affected.value !== 1 ? 's' : ''} (${impact.value}).`;
      }

      return 'Dependency analysis completed.';
    },

    duplicate: () => {
      const similarity = factors.find(f => f.factor === 'similarity');
      const matches = factors.find(f => f.factor === 'matches');

      if (similarity && matches) {
        const percent = Math.round(similarity.value * 100);
        return `${percent}% similar to ${matches.value} other task${matches.value !== 1 ? 's' : ''}.`;
      }

      return 'Duplicate detection completed.';
    }
  };

  const builder = explanations[type];
  if (builder) {
    return builder();
  }

  // Fallback: generic explanation
  return factors
    .map(f => `${f.factor}: ${f.impact}`)
    .join('; ');
}

/**
 * Format a score with explanation
 * @param {number} score - Numeric score
 * @param {string} explanation - Human-readable explanation
 * @returns {Object}
 */
function formatScore(score, explanation) {
  return {
    score,
    explanation,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  buildExplanation,
  formatScore
};
