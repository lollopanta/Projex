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
