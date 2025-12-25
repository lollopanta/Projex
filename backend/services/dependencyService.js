/**
 * ============================================
 * DEPENDENCY SERVICE
 * Graph algorithms for task dependencies
 * ============================================
 */

const Task = require('../models/Task');

/**
 * Detect if adding a dependency would create a cycle
 * Uses DFS to detect cycles in the dependency graph
 * 
 * @param {string} taskId - The task that will have dependencies added
 * @param {string[]} newDependencies - Array of task IDs to depend on
 * @returns {Promise<{hasCycle: boolean, cyclePath?: string[]}>}
 */
async function detectCycle(taskId, newDependencies) {
  if (!newDependencies || newDependencies.length === 0) {
    return { hasCycle: false };
  }

  // Build adjacency list: taskId -> [dependencies]
  const graph = new Map();
  const taskIdStr = taskId ? taskId.toString() : null;

  // Helper to get dependencies for a task
  async function getDependencies(currentTaskId) {
    if (currentTaskId === taskIdStr) {
      // Use the new dependencies being added
      return newDependencies.map(dep => dep.toString());
    } else {
      const task = await Task.findById(currentTaskId).select('dependencies');
      if (task) {
        return task.dependencies.map(dep => dep.toString());
      }
      return [];
    }
  }

  // Build graph by traversing from new dependencies
  const visited = new Set();
  const buildQueue = [...newDependencies.map(dep => dep.toString())];

  while (buildQueue.length > 0) {
    const currentId = buildQueue.shift();
    if (visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);

    const dependencies = await getDependencies(currentId);
    graph.set(currentId, dependencies);

    // Add dependencies to queue
    for (const depId of dependencies) {
      if (!visited.has(depId)) {
        buildQueue.push(depId);
      }
    }
  }

  // DFS to detect cycles - check if any dependency can reach back to taskId
  const recursionStack = new Set();

  function hasCycleDFS(nodeId, path = []) {
    // If we're back at the original task, we have a cycle
    if (nodeId === taskIdStr) {
      return { hasCycle: true, path: [...path, nodeId] };
    }

    if (recursionStack.has(nodeId)) {
      // Found a cycle (not necessarily involving taskId)
      return { hasCycle: true, path: [...path, nodeId] };
    }

    recursionStack.add(nodeId);
    path.push(nodeId);

    const dependencies = graph.get(nodeId) || [];
    for (const depId of dependencies) {
      const result = hasCycleDFS(depId, path);
      if (result.hasCycle) {
        return result;
      }
    }

    recursionStack.delete(nodeId);
    path.pop();
    return { hasCycle: false };
  }

  // Check each new dependency for cycles
  for (const depId of newDependencies) {
    recursionStack.clear();
    const result = hasCycleDFS(depId.toString(), []);
    if (result.hasCycle) {
      return { hasCycle: true, cyclePath: result.path || [] };
    }
  }

  return { hasCycle: false };
}

/**
 * Check if a task is blocked by its dependencies
 * A task is blocked if ANY dependency is not completed
 * 
 * @param {Object} task - Task document (must have dependencies populated or as IDs)
 * @returns {Promise<boolean>}
 */
async function isTaskBlocked(task) {
  if (!task.dependencies || task.dependencies.length === 0) {
    return false;
  }

  // If dependencies are populated, check directly
  if (task.dependencies[0] && typeof task.dependencies[0] === 'object' && 'completed' in task.dependencies[0]) {
    return task.dependencies.some(dep => !dep.completed);
  }

  // Otherwise, fetch dependencies
  const dependencyIds = task.dependencies.map(dep => 
    typeof dep === 'object' ? dep._id || dep : dep
  );

  const dependencies = await Task.find({
    _id: { $in: dependencyIds }
  }).select('completed');

  return dependencies.some(dep => !dep.completed);
}

/**
 * Get all tasks that are directly or indirectly blocked by a given task
 * This includes:
 * - Direct dependents (tasks that have this task in their dependencies)
 * - Indirect dependents (tasks that depend on tasks that depend on this task, etc.)
 * 
 * @param {string} taskId - The task to analyze
 * @returns {Promise<{direct: string[], indirect: string[], all: string[]}>}
 */
async function getImpactedTasks(taskId) {
  const direct = [];
  const indirect = [];
  const all = new Set();
  const visited = new Set();

  // Find all tasks that directly depend on this task
  const directDependents = await Task.find({
    dependencies: taskId
  }).select('_id');

  directDependents.forEach(task => {
    const id = task._id.toString();
    direct.push(id);
    all.add(id);
  });

  // BFS to find all indirect dependents
  const queue = [...direct];
  visited.add(taskId);

  while (queue.length > 0) {
    const currentId = queue.shift();
    
    if (visited.has(currentId)) {
      continue;
    }
    
    visited.add(currentId);

    // Find tasks that depend on current task
    const dependents = await Task.find({
      dependencies: currentId
    }).select('_id');

    for (const dependent of dependents) {
      const depId = dependent._id.toString();
      
      if (!all.has(depId)) {
        if (!direct.includes(depId)) {
          indirect.push(depId);
        }
        all.add(depId);
        queue.push(depId);
      }
    }
  }

  return {
    direct,
    indirect,
    all: Array.from(all)
  };
}

/**
 * Get dependency graph data for visualization
 * Returns upstream (dependencies) and downstream (dependents) tasks
 * 
 * @param {string} taskId - The task to analyze
 * @param {number} maxDepth - Maximum depth to traverse (default: 5)
 * @returns {Promise<{upstream: Array, downstream: Array, task: Object}>}
 */
async function getDependencyGraph(taskId, maxDepth = 5) {
  const task = await Task.findById(taskId)
    .populate('dependencies', 'title completed priority dueDate')
    .populate('assignedTo', 'username firstName lastName')
    .populate('project', 'name color')
    .populate('list', 'name color');

  if (!task) {
    throw new Error('Task not found');
  }

  const upstream = [];
  const downstream = [];
  const visitedUpstream = new Set();
  const visitedDownstream = new Set();

  // Recursively get upstream dependencies
  async function getUpstream(currentTaskId, depth = 0) {
    if (depth > maxDepth || visitedUpstream.has(currentTaskId)) {
      return;
    }

    visitedUpstream.add(currentTaskId);

    const currentTask = await Task.findById(currentTaskId)
      .populate('dependencies', 'title completed priority dueDate')
      .populate('assignedTo', 'username firstName lastName')
      .populate('project', 'name color')
      .populate('list', 'name color');

    if (!currentTask) {
      return;
    }

    if (currentTaskId !== taskId) {
      upstream.push({
        task: currentTask,
        depth
      });
    }

    for (const depId of currentTask.dependencies) {
      const depIdStr = depId._id ? depId._id.toString() : depId.toString();
      await getUpstream(depIdStr, depth + 1);
    }
  }

  // Recursively get downstream dependents
  async function getDownstream(currentTaskId, depth = 0) {
    if (depth > maxDepth || visitedDownstream.has(currentTaskId)) {
      return;
    }

    visitedDownstream.add(currentTaskId);

    const dependents = await Task.find({
      dependencies: currentTaskId
    })
      .populate('dependencies', 'title completed priority dueDate')
      .populate('assignedTo', 'username firstName lastName')
      .populate('project', 'name color')
      .populate('list', 'name color');

    for (const dependent of dependents) {
      const depId = dependent._id.toString();
      
      if (depId !== taskId) {
        downstream.push({
          task: dependent,
          depth
        });
        
        await getDownstream(depId, depth + 1);
      }
    }
  }

  // Build graph
  await getUpstream(taskId);
  await getDownstream(taskId);

  return {
    task,
    upstream,
    downstream
  };
}

/**
 * Recalculate blocked state for all tasks that depend on a completed task
 * This is called when a task is marked as completed
 * 
 * @param {string} completedTaskId - The task that was just completed
 * @returns {Promise<void>}
 */
async function unblockDependentTasks(completedTaskId) {
  // Find all tasks that depend on this completed task
  const dependentTasks = await Task.find({
    dependencies: completedTaskId,
    completed: false // Only check incomplete tasks
  });

  // For each dependent task, check if it's still blocked
  // (it might have other incomplete dependencies)
  for (const dependent of dependentTasks) {
    await isTaskBlocked(dependent);
    
    // Note: We don't store 'blocked' as a field, it's computed
    // But we could emit events or update other fields if needed
    // For now, this function serves as a hook point for future features
  }
}

/**
 * Validate dependencies before saving
 * Checks for cycles and ensures all dependency tasks exist
 * 
 * @param {string} taskId - Task ID (null for new tasks)
 * @param {string[]} dependencyIds - Array of dependency task IDs
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
async function validateDependencies(taskId, dependencyIds) {
  if (!dependencyIds || dependencyIds.length === 0) {
    return { valid: true };
  }

  // Remove duplicates
  const uniqueDeps = [...new Set(dependencyIds.map(id => id.toString()))];

  // Check if task depends on itself
  if (taskId && uniqueDeps.includes(taskId.toString())) {
    return { valid: false, error: 'A task cannot depend on itself' };
  }

  // Check if all dependency tasks exist
  const existingTasks = await Task.find({
    _id: { $in: uniqueDeps }
  }).select('_id');

  if (existingTasks.length !== uniqueDeps.length) {
    const existingIds = existingTasks.map(t => t._id.toString());
    const missingIds = uniqueDeps.filter(id => !existingIds.includes(id));
    return { valid: false, error: `Dependency tasks not found: ${missingIds.join(', ')}` };
  }

  // Check for cycles
  const cycleCheck = await detectCycle(taskId, uniqueDeps);
  if (cycleCheck.hasCycle) {
    const cyclePath = cycleCheck.cyclePath || [];
    return {
      valid: false,
      error: `Circular dependency detected: ${cyclePath.join(' → ')} → ${cyclePath[0]}`
    };
  }

  return { valid: true };
}

module.exports = {
  detectCycle,
  isTaskBlocked,
  getImpactedTasks,
  getDependencyGraph,
  unblockDependentTasks,
  validateDependencies
};
