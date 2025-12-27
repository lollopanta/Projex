/**
 * ============================================
 * SMART ENGINE HOOKS
 * TanStack Query hooks for Smart Engine
 * ============================================
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import {
  smartEngineApi,
  type CalculatePriorityRequest,
  type CalculatePrioritiesRequest,
  type CalculateWorkloadRequest,
  type CalculateWorkloadsRequest,
  type EstimateTimeRequest,
  type DetectDuplicatesRequest,
  type AnalyzeDependencyImpactRequest,
} from "@/api";

// Query keys
export const smartEngineKeys = {
  all: ["smart-engine"] as const,
  priority: (taskId: string) => [...smartEngineKeys.all, "priority", taskId] as const,
  priorities: (taskIds: string[]) => [...smartEngineKeys.all, "priorities", taskIds.sort().join(",")] as const,
  workload: (userId: string) => [...smartEngineKeys.all, "workload", userId] as const,
  workloads: (userIds?: string[], projectId?: string) => 
    [...smartEngineKeys.all, "workloads", userIds?.sort().join(","), projectId] as const,
  estimate: (taskId: string) => [...smartEngineKeys.all, "estimate", taskId] as const,
  duplicates: (taskIds?: string[], projectId?: string) => 
    [...smartEngineKeys.all, "duplicates", taskIds?.sort().join(","), projectId] as const,
  dependencyImpact: (taskId: string) => [...smartEngineKeys.all, "dependency-impact", taskId] as const,
};

/**
 * Hook to calculate priority for a single task
 */
export const useTaskPriority = (taskId: string, projectId?: string, assigneeIds?: string[]) => {
  // Include current minute in query key to ensure fresh calculations
  const currentMinute = Math.floor(Date.now() / (1000 * 60));
  
  return useQuery({
    queryKey: [...smartEngineKeys.priority(taskId), currentMinute],
    queryFn: () => smartEngineApi.calculatePriority({ 
      taskId, 
      projectId, 
      assigneeIds,
      // Pass current date in UTC format to match backend calculation
      currentDate: new Date().toISOString()
    }),
    enabled: !!taskId,
    staleTime: 1000 * 60, // 1 minute (shorter for more accurate calculations)
  });
};

/**
 * Hook to calculate priorities for multiple tasks
 */
export const useTaskPriorities = (taskIds: string[], projectId?: string) => {
  // Include current minute in query key to ensure fresh calculations
  const currentMinute = Math.floor(Date.now() / (1000 * 60));
  
  return useQuery({
    queryKey: [...smartEngineKeys.priorities(taskIds), currentMinute],
    queryFn: () => smartEngineApi.calculatePriorities({ 
      taskIds, 
      projectId,
      // Pass current date in UTC format to match backend calculation
      currentDate: new Date().toISOString()
    }),
    enabled: taskIds.length > 0,
    staleTime: 1000 * 60, // 1 minute (shorter for more accurate calculations)
  });
};

/**
 * Hook to calculate workload for a user
 */
export const useUserWorkload = (userId: string) => {
  return useQuery({
    queryKey: smartEngineKeys.workload(userId),
    queryFn: () => smartEngineApi.calculateWorkload({ userId }),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Hook to calculate workloads for multiple users
 */
export const useUserWorkloads = (userIds?: string[], projectId?: string) => {
  return useQuery({
    queryKey: smartEngineKeys.workloads(userIds, projectId),
    queryFn: () => smartEngineApi.calculateWorkloads({ userIds, projectId }),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Hook to estimate time for a task
 */
export const useTimeEstimate = (taskId: string, userId?: string, projectId?: string) => {
  return useQuery({
    queryKey: smartEngineKeys.estimate(taskId),
    queryFn: () => smartEngineApi.estimateTime({ taskId, userId, projectId }),
    enabled: !!taskId,
    staleTime: 1000 * 60 * 30, // 30 minutes (estimates don't change often)
  });
};

/**
 * Hook to detect duplicate tasks
 */
export const useDuplicateDetection = (taskIds?: string[], projectId?: string) => {
  return useQuery({
    queryKey: smartEngineKeys.duplicates(taskIds, projectId),
    queryFn: () => smartEngineApi.detectDuplicates({ taskIds, projectId }),
    enabled: (taskIds && taskIds.length > 0) || !!projectId,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
};

/**
 * Hook to analyze dependency impact
 */
export const useDependencyImpact = (taskId: string) => {
  return useQuery({
    queryKey: smartEngineKeys.dependencyImpact(taskId),
    queryFn: () => smartEngineApi.analyzeDependencyImpact({ taskId }),
    enabled: !!taskId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Mutation hook to manually trigger priority calculation
 */
export const useCalculatePriority = () => {
  return useMutation({
    mutationFn: (data: CalculatePriorityRequest) => smartEngineApi.calculatePriority(data),
  });
};

/**
 * Mutation hook to manually trigger priorities calculation
 */
export const useCalculatePriorities = () => {
  return useMutation({
    mutationFn: (data: CalculatePrioritiesRequest) => smartEngineApi.calculatePriorities(data),
  });
};

/**
 * Mutation hook to manually trigger workload calculation
 */
export const useCalculateWorkload = () => {
  return useMutation({
    mutationFn: (data: CalculateWorkloadRequest) => smartEngineApi.calculateWorkload(data),
  });
};

/**
 * Mutation hook to manually trigger time estimation
 */
export const useEstimateTime = () => {
  return useMutation({
    mutationFn: (data: EstimateTimeRequest) => smartEngineApi.estimateTime(data),
  });
};
