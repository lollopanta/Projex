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
  KanbanColumn,
  CreateKanbanColumnRequest,
  UpdateKanbanColumnRequest,
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
 * Update a member's role in project
 */
export const updateProjectMemberRole = async (
  projectId: string,
  memberId: string,
  role: "viewer" | "editor" | "admin"
): ApiResponse<Project> => {
  const response = await apiClient.put<Project>(`/projects/${projectId}/members/${memberId}`, { role });
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

/**
 * Get all Kanban columns for a project
 */
export const getKanbanColumns = async (projectId: string): ApiResponse<KanbanColumn[]> => {
  const response = await apiClient.get<KanbanColumn[]>(`/projects/${projectId}/columns`);
  return response.data;
};

/**
 * Create a new Kanban column
 */
export const createKanbanColumn = async (
  projectId: string,
  data: CreateKanbanColumnRequest
): ApiResponse<KanbanColumn> => {
  const response = await apiClient.post<KanbanColumn>(`/projects/${projectId}/columns`, data);
  return response.data;
};

/**
 * Update a Kanban column
 */
export const updateKanbanColumn = async (
  projectId: string,
  columnId: string,
  data: UpdateKanbanColumnRequest
): ApiResponse<KanbanColumn> => {
  const response = await apiClient.put<KanbanColumn>(`/projects/${projectId}/columns/${columnId}`, data);
  return response.data;
};

/**
 * Delete a Kanban column
 */
export const deleteKanbanColumn = async (
  projectId: string,
  columnId: string
): ApiResponse<MessageResponse> => {
  const response = await apiClient.delete<MessageResponse>(`/projects/${projectId}/columns/${columnId}`);
  return response.data;
};

/**
 * Reorder Kanban columns
 */
export const reorderKanbanColumns = async (
  projectId: string,
  columnIds: string[]
): ApiResponse<KanbanColumn[]> => {
  const response = await apiClient.put<KanbanColumn[]>(`/projects/${projectId}/columns/reorder`, {
    columnIds,
  });
  return response.data;
};

// Export all functions as an object for convenience (must be after all function declarations)
export const projectsApi = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
  getKanbanColumns,
  createKanbanColumn,
  updateKanbanColumn,
  deleteKanbanColumn,
  reorderKanbanColumns,
};
