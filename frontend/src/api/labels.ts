/**
 * ============================================
 * LABELS API ENDPOINTS
 * ============================================
 */

import apiClient, { type ApiResponse } from "./client";
import type { Label, CreateLabelRequest, UpdateLabelRequest, MessageResponse } from "@/types";

/**
 * Get all labels for current user
 */
export const getLabels = async (): ApiResponse<Label[]> => {
  const response = await apiClient.get<Label[]>("/labels");
  return response.data;
};

/**
 * Create a new label
 */
export const createLabel = async (data: CreateLabelRequest): ApiResponse<Label> => {
  const response = await apiClient.post<Label>("/labels", data);
  return response.data;
};

/**
 * Update a label
 */
export const updateLabel = async (id: string, data: UpdateLabelRequest): ApiResponse<Label> => {
  const response = await apiClient.put<Label>(`/labels/${id}`, data);
  return response.data;
};

/**
 * Delete a label
 */
export const deleteLabel = async (id: string): ApiResponse<MessageResponse> => {
  const response = await apiClient.delete<MessageResponse>(`/labels/${id}`);
  return response.data;
};
