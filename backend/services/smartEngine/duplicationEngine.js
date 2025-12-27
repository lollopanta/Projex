/**
 * ============================================
 * SMART ENGINE - DUPLICATION DETECTION ENGINE
 * Detects similar/duplicate tasks using Jaccard similarity
 * ============================================
 */

const { buildExplanation } = require('./explanation');
const { loadConfig } = require('./config');

/**
 * Normalize a title for comparison
 * @param {string} title - Task title
 * @returns {string} Normalized title
 */
function normalizeTitle(title) {
  if (!title) return '';
  
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ');    // Normalize whitespace
}

/**
 * Tokenize a title into words
 * @param {string} title - Task title
 * @returns {string[]} Array of tokens
 */
function tokenize(title) {
  const normalized = normalizeTitle(title);
  return normalized.split(' ').filter(token => token.length > 0);
}

/**
 * Calculate Jaccard similarity between two sets
 * @param {Set} set1 - First set
 * @param {Set} set2 - Second set
 * @returns {number} Similarity score (0-1)
 */
function jaccardSimilarity(set1, set2) {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  if (union.size === 0) return 0;
  
  return intersection.size / union.size;
}

/**
 * Find duplicate/similar tasks
 * @param {Object} taskSnapshot - TaskSnapshot to check
 * @param {Object[]} otherTaskSnapshots - Array of other TaskSnapshot objects to compare against
 * @param {Object} config - Configuration object (optional)
 * @returns {Object[]} Array of similar tasks with similarity scores
 */
function findDuplicates(taskSnapshot, otherTaskSnapshots = [], config = null) {
  if (!config) {
    config = loadConfig();
  }

  const taskTokens = new Set(tokenize(taskSnapshot.title));
  
  // Filter out tokens that are too short
  if (taskTokens.size < config.duplication.minTokens) {
    return [];
  }

  const similarTasks = [];

  for (const otherTask of otherTaskSnapshots) {
    // Skip self
    if (otherTask.id === taskSnapshot.id) {
      continue;
    }

    // Skip completed tasks if we only want active duplicates
    // (This can be configurable)

    const otherTokens = new Set(tokenize(otherTask.title));
    
    if (otherTokens.size < config.duplication.minTokens) {
      continue;
    }

    const similarity = jaccardSimilarity(taskTokens, otherTokens);

    if (similarity >= config.duplication.similarityThreshold) {
      similarTasks.push({
        taskId: otherTask.id,
        title: otherTask.title,
        similarity,
        projectId: otherTask.projectId,
        done: otherTask.done
      });
    }
  }

  // Sort by similarity (highest first)
  similarTasks.sort((a, b) => b.similarity - a.similarity);

  return similarTasks;
}

/**
 * Detect duplicates for multiple tasks
 * @param {Object[]} taskSnapshots - Array of TaskSnapshot objects
 * @param {Object} config - Configuration object (optional)
 * @returns {Object[]} Array of duplicate detection results
 */
function detectDuplicates(taskSnapshots, config = null) {
  if (!config) {
    config = loadConfig();
  }

  return taskSnapshots.map(task => {
    const otherTasks = taskSnapshots.filter(t => t.id !== task.id);
    const duplicates = findDuplicates(task, otherTasks, config);

    if (duplicates.length === 0) {
      return {
        taskId: task.id,
        title: task.title,
        hasDuplicates: false,
        similarTasks: [],
        explanation: 'No similar tasks found.'
      };
    }

    const factors = [
      {
        factor: 'similarity',
        value: duplicates[0].similarity,
        impact: `${Math.round(duplicates[0].similarity * 100)}% similar`
      },
      {
        factor: 'matches',
        value: duplicates.length,
        impact: `${duplicates.length} similar task${duplicates.length !== 1 ? 's' : ''}`
      }
    ];

    const explanation = buildExplanation('duplicate', factors);

    return {
      taskId: task.id,
      title: task.title,
      hasDuplicates: true,
      similarTasks: duplicates,
      explanation,
      highestSimilarity: duplicates[0].similarity
    };
  }).filter(result => result.hasDuplicates); // Only return tasks with duplicates
}

module.exports = {
  findDuplicates,
  detectDuplicates,
  normalizeTitle,
  tokenize,
  jaccardSimilarity
};
