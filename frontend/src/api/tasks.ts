/**
 * ============================================
 * TASKS API ENDPOINTS
 * ============================================
 */

import apiClient, { type ApiResponse } from "./client";
import type {
  TaskPopulated,
  CreateTaskRequest,
  UpdateTaskRequest,
  CreateSubtaskRequest,
  TaskQueryParams,
  PaginatedResponse,
  MessageResponse,
  DependencyGraph,
  ImpactAnalysis,
} from "@/types";

/**
 * Get all tasks with filtering and pagination
 */
export const getTasks = async (
  params?: TaskQueryParams
): ApiResponse<PaginatedResponse<TaskPopulated>> => {
  const response = await apiClient.get<PaginatedResponse<TaskPopulated>>("/tasks", { params });
  return response.data;
};

/**
 * Get task by ID
 */
export const getTaskById = async (id: string): ApiResponse<TaskPopulated> => {
  const response = await apiClient.get<TaskPopulated>(`/tasks/${id}`);
  return response.data;
};

/**
 * Create a new task
 */
export const createTask = async (data: CreateTaskRequest): ApiResponse<TaskPopulated> => {
  const response = await apiClient.post<TaskPopulated>("/tasks", data);
  return response.data;
};

/**
 * Update a task
 */
export const updateTask = async (
  id: string,
  data: UpdateTaskRequest
): ApiResponse<TaskPopulated> => {
  const response = await apiClient.put<TaskPopulated>(`/tasks/${id}`, data);
  return response.data;
};

/**
 * Delete a task
 */
export const deleteTask = async (id: string): ApiResponse<MessageResponse> => {
  const response = await apiClient.delete<MessageResponse>(`/tasks/${id}`);
  return response.data;
};

/**
 * Toggle task completion
 */
export const toggleTaskComplete = async (id: string): ApiResponse<TaskPopulated> => {
  const response = await apiClient.patch<TaskPopulated>(`/tasks/${id}/complete`);
  return response.data;
};

/**
 * Add a subtask to a task
 */
export const addSubtask = async (
  taskId: string,
  data: CreateSubtaskRequest
): ApiResponse<TaskPopulated> => {
  const response = await apiClient.post<TaskPopulated>(`/tasks/${taskId}/subtasks`, data);
  return response.data;
};

/**
 * Get dependency graph for a task
 */
export const getTaskDependencies = async (taskId: string): ApiResponse<DependencyGraph> => {
  const response = await apiClient.get<DependencyGraph>(`/tasks/${taskId}/dependencies`);
  return response.data;
};

/**
 * Add dependencies to a task
 */
export const addTaskDependencies = async (
  taskId: string,
  dependencies: string[]
): ApiResponse<TaskPopulated> => {
  const response = await apiClient.post<TaskPopulated>(`/tasks/${taskId}/dependencies`, {
    dependencies,
  });
  return response.data;
};

/**
 * Remove a dependency from a task
 */
export const removeTaskDependency = async (
  taskId: string,
  dependencyId: string
): ApiResponse<TaskPopulated> => {
  const response = await apiClient.delete<TaskPopulated>(
    `/tasks/${taskId}/dependencies/${dependencyId}`
  );
  return response.data;
};

/**
 * Get impact analysis for a task
 */
export const getTaskImpact = async (taskId: string): ApiResponse<ImpactAnalysis> => {
  const response = await apiClient.get<ImpactAnalysis>(`/tasks/${taskId}/impact`);
  return response.data;
};
