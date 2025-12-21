/**
 * ============================================
 * COMMENTS API ENDPOINTS
 * ============================================
 */

import apiClient, { type ApiResponse } from "./client";
import type {
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
  MessageResponse,
} from "@/types";

/**
 * Get all comments for a task
 */
export const getTaskComments = async (taskId: string): ApiResponse<Comment[]> => {
  const response = await apiClient.get<Comment[]>(`/comments/task/${taskId}`);
  return response.data;
};

/**
 * Create a new comment
 */
export const createComment = async (data: CreateCommentRequest): ApiResponse<Comment> => {
  const response = await apiClient.post<Comment>("/comments", data);
  return response.data;
};

/**
 * Update a comment
 */
export const updateComment = async (
  id: string,
  data: UpdateCommentRequest
): ApiResponse<Comment> => {
  const response = await apiClient.put<Comment>(`/comments/${id}`, data);
  return response.data;
};

/**
 * Delete a comment
 */
export const deleteComment = async (id: string): ApiResponse<MessageResponse> => {
  const response = await apiClient.delete<MessageResponse>(`/comments/${id}`);
  return response.data;
};
