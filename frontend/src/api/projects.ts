/**
 * ============================================
 * PROJECTS API ENDPOINTS
 * ============================================
 */

import apiClient, { type ApiResponse } from "./client";
import type {
  Project,
  ProjectWithStats,
  CreateProjectRequest,
  UpdateProjectRequest,
  AddProjectMemberRequest,
  MessageResponse,
} from "@/types";

/**
 * Get all projects for current user
 */
export const getProjects = async (): ApiResponse<Project[]> => {
  const response = await apiClient.get<Project[]>("/projects");
  return response.data;
};

/**
 * Get project by ID (with stats)
 */
export const getProjectById = async (id: string): ApiResponse<ProjectWithStats> => {
  const response = await apiClient.get<ProjectWithStats>(`/projects/${id}`);
  return response.data;
};

/**
 * Create a new project
 */
export const createProject = async (data: CreateProjectRequest): ApiResponse<Project> => {
  const response = await apiClient.post<Project>("/projects", data);
  return response.data;
};

/**
 * Update a project
 */
export const updateProject = async (
  id: string,
  data: UpdateProjectRequest
): ApiResponse<Project> => {
  const response = await apiClient.put<Project>(`/projects/${id}`, data);
  return response.data;
};

/**
 * Delete a project
 */
export const deleteProject = async (id: string): ApiResponse<MessageResponse> => {
  const response = await apiClient.delete<MessageResponse>(`/projects/${id}`);
  return response.data;
};

/**
 * Add a member to project
 */
export const addProjectMember = async (
  projectId: string,
  data: AddProjectMemberRequest
): ApiResponse<Project> => {
  const response = await apiClient.post<Project>(`/projects/${projectId}/members`, data);
  return response.data;
};

/**
 * Remove a member from project
 */
export const removeProjectMember = async (
  projectId: string,
  memberId: string
): ApiResponse<Project> => {
  const response = await apiClient.delete<Project>(`/projects/${projectId}/members/${memberId}`);
  return response.data;
};
