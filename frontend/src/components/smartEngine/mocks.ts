/**
 * ============================================
 * SMART ENGINE MOCKS
 * Mock data for development and testing
 * ============================================
 */

import type {
  PriorityResult,
  WorkloadResult,
  EstimationResult,
  DuplicateResult,
  DependencyImpactResult,
} from "@/api/smartEngine";

/**
 * Mock priority result for a task
 */
export const mockPriorityResult = (taskId: string, score: number = 75): PriorityResult => ({
  taskId,
  priorityScore: score,
  reasons: [
    score >= 67 ? "due in 2 days" : score >= 34 ? "due in 5 days" : "due in 10 days",
    score >= 67 ? "blocks 3 tasks" : score >= 34 ? "blocks 1 task" : "no dependencies",
    score >= 67 ? "assignee available" : "assignee balanced",
  ],
  explanation: `High priority because: ${score >= 67 ? "due in 2 days, blocks 3 tasks" : score >= 34 ? "due in 5 days, blocks 1 task" : "due in 10 days, no dependencies"}.`,
  factors: [
    {
      factor: "urgency",
      value: score >= 67 ? 8.5 : score >= 34 ? 5.2 : 2.1,
      impact: score >= 67 ? "due in 2 days" : score >= 34 ? "due in 5 days" : "due in 10 days",
    },
    {
      factor: "blocking",
      value: score >= 67 ? 3 : score >= 34 ? 1 : 0,
      impact: score >= 67 ? "blocks 3 tasks" : score >= 34 ? "blocks 1 task" : "no dependencies",
    },
    {
      factor: "manualPriority",
      value: score >= 67 ? 5 : score >= 34 ? 3 : 1,
      impact: score >= 67 ? "high" : score >= 34 ? "medium" : "low",
    },
  ],
});

/**
 * Mock workload result for a user
 */
export const mockWorkloadResult = (userId: string, loadPercentage: number = 85): WorkloadResult => ({
  userId,
  userName: "John Doe",
  weeklyLoad: Math.round(2400 * (loadPercentage / 100)),
  capacity: 2400,
  loadPercentage,
  status: loadPercentage >= 100 ? "overload" : loadPercentage >= 90 ? "warning" : loadPercentage <= 30 ? "underutilized" : "balanced",
  warnings: loadPercentage >= 100
    ? ["User is overloaded: 100% capacity used"]
    : loadPercentage >= 90
    ? ["User is approaching capacity: 90% capacity used"]
    : [],
  suggestions: loadPercentage >= 100
    ? ["Consider reassigning some tasks or extending deadlines"]
    : loadPercentage <= 30
    ? ["User is underutilized. Consider assigning more tasks."]
    : [],
  explanation: loadPercentage >= 100
    ? `Overloaded: ${loadPercentage}% capacity used (${Math.round(2400 * (loadPercentage / 100))} min / 2400 min per week).`
    : loadPercentage <= 30
    ? `Underutilized: ${loadPercentage}% capacity used. Consider assigning more tasks.`
    : `Balanced workload: ${loadPercentage}% capacity used.`,
  assignedTaskCount: Math.round(loadPercentage / 10),
});

/**
 * Mock time estimation result
 */
export const mockEstimationResult = (confidence: number = 0.8): EstimationResult => ({
  estimatedMinutes: 120,
  confidenceLevel: confidence,
  basedOn: ["label:backend", "project:api"],
  explanation: `Estimated 2 hours (${confidence >= 0.8 ? "high" : confidence >= 0.5 ? "medium" : "low"} confidence based on label:backend, project:api).`,
  sampleSize: Math.round(confidence * 15),
});

/**
 * Mock duplicate detection result
 */
export const mockDuplicateResult = (taskId: string, similarity: number = 0.85): DuplicateResult => ({
  taskId,
  title: "Fix login bug",
  hasDuplicates: true,
  similarTasks: [
    {
      taskId: "other_task_id",
      title: "Fix login bug",
      similarity,
      projectId: "project_id",
      done: false,
    },
  ],
  explanation: `${Math.round(similarity * 100)}% similar to 1 other task.`,
  highestSimilarity: similarity,
});

/**
 * Mock dependency impact result
 */
export const mockDependencyImpactResult = (taskId: string, affectedCount: number = 3): DependencyImpactResult => ({
  taskId,
  direct: [`task_${taskId}_1`, `task_${taskId}_2`],
  indirect: [`task_${taskId}_3`],
  all: Array.from({ length: affectedCount }, (_, i) => `task_${taskId}_${i + 1}`),
  totalAffected: affectedCount,
  factors: [
    {
      factor: "impact",
      value: affectedCount > 0 ? "high" : "none",
      impact: affectedCount > 0 ? "high" : "none",
    },
    {
      factor: "affectedTasks",
      value: affectedCount,
      impact: `${affectedCount} task${affectedCount !== 1 ? "s" : ""}`,
    },
  ],
});

/**
 * Simulate API delay for development
 */
export const delay = (ms: number = 500): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
