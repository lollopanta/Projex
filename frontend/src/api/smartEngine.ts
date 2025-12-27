/**
 * ============================================
 * SMART ENGINE API ENDPOINTS
 * ============================================
 */

import apiClient, { type ApiResponse } from "./client";

// Types for Smart Engine responses
export interface PriorityResult {
  taskId: string;
  priorityScore: number;
  reasons: string[];
  explanation: string;
  factors: Array<{
    factor: string;
    value: any;
    impact: string;
  }>;
}

export interface WorkloadResult {
  userId: string;
  userName: string;
  weeklyLoad: number;
  capacity: number;
  loadPercentage: number;
  status: "overload" | "warning" | "balanced" | "underutilized";
  warnings: string[];
  suggestions: string[];
  explanation: string;
  assignedTaskCount: number;
}

export interface EstimationResult {
  estimatedMinutes: number;
  confidenceLevel: number;
  basedOn: string[];
  explanation: string;
  sampleSize: number;
}

export interface DuplicateResult {
  taskId: string;
  title: string;
  hasDuplicates: boolean;
  similarTasks: Array<{
    taskId: string;
    title: string;
    similarity: number;
    projectId: string | null;
    done: boolean;
  }>;
  explanation: string;
  highestSimilarity?: number;
}

export interface DependencyImpactResult {
  taskId: string;
  direct: string[];
  indirect: string[];
  all: string[];
  totalAffected: number;
  factors: Array<{
    factor: string;
    value: any;
    impact: string;
  }>;
}

// Request types
export interface CalculatePriorityRequest {
  taskId: string;
  projectId?: string;
  assigneeIds?: string[];
  currentDate?: string;
}

export interface CalculatePrioritiesRequest {
  taskIds: string[];
  projectId?: string;
  currentDate?: string;
}

export interface CalculateWorkloadRequest {
  userId: string;
}

export interface CalculateWorkloadsRequest {
  userIds?: string[];
  projectId?: string;
}

export interface EstimateTimeRequest {
  taskId: string;
  userId?: string;
  projectId?: string;
}

export interface DetectDuplicatesRequest {
  taskIds?: string[];
  projectId?: string;
}

export interface AnalyzeDependencyImpactRequest {
  taskId: string;
}

/**
 * Calculate priority for a single task
 */
export const calculatePriority = async (
  data: CalculatePriorityRequest
): ApiResponse<PriorityResult> => {
  const response = await apiClient.post<PriorityResult>(
    "/internal/smart-engine/priority",
    data
  );
  return response.data;
};

/**
 * Calculate priorities for multiple tasks
 */
export const calculatePriorities = async (
  data: CalculatePrioritiesRequest
): ApiResponse<PriorityResult[]> => {
  const response = await apiClient.post<PriorityResult[]>(
    "/internal/smart-engine/priorities",
    data
  );
  return response.data;
};

/**
 * Calculate workload for a user
 */
export const calculateWorkload = async (
  data: CalculateWorkloadRequest
): ApiResponse<WorkloadResult> => {
  const response = await apiClient.post<WorkloadResult>(
    "/internal/smart-engine/workload",
    data
  );
  return response.data;
};

/**
 * Calculate workloads for multiple users
 */
export const calculateWorkloads = async (
  data: CalculateWorkloadsRequest
): ApiResponse<WorkloadResult[]> => {
  const response = await apiClient.post<WorkloadResult[]>(
    "/internal/smart-engine/workloads",
    data
  );
  return response.data;
};

/**
 * Estimate time for a task
 */
export const estimateTime = async (
  data: EstimateTimeRequest
): ApiResponse<EstimationResult> => {
  const response = await apiClient.post<EstimationResult>(
    "/internal/smart-engine/estimate",
    data
  );
  return response.data;
};

/**
 * Detect duplicate tasks
 */
export const detectDuplicates = async (
  data: DetectDuplicatesRequest
): ApiResponse<DuplicateResult[]> => {
  const response = await apiClient.post<DuplicateResult[]>(
    "/internal/smart-engine/duplicates",
    data
  );
  return response.data;
};

/**
 * Analyze dependency impact
 */
export const analyzeDependencyImpact = async (
  data: AnalyzeDependencyImpactRequest
): ApiResponse<DependencyImpactResult> => {
  const response = await apiClient.post<DependencyImpactResult>(
    "/internal/smart-engine/dependencies",
    data
  );
  return response.data;
};
