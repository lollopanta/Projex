/**
 * ============================================
 * LISTS API ENDPOINTS
 * ============================================
 */

import apiClient, { type ApiResponse } from "./client";
import type {
  List,
  ListWithStats,
  CreateListRequest,
  UpdateListRequest,
  AddListMemberRequest,
  ListQueryParams,
  MessageResponse,
} from "@/types";

/**
 * Get all lists for current user
 */
export const getLists = async (params?: ListQueryParams): ApiResponse<List[]> => {
  const response = await apiClient.get<List[]>("/lists", { params });
  return response.data;
};

/**
 * Get list by ID (with stats)
 */
export const getListById = async (id: string): ApiResponse<ListWithStats> => {
  const response = await apiClient.get<ListWithStats>(`/lists/${id}`);
  return response.data;
};

/**
 * Create a new list
 */
export const createList = async (data: CreateListRequest): ApiResponse<List> => {
  const response = await apiClient.post<List>("/lists", data);
  return response.data;
};

/**
 * Update a list
 */
export const updateList = async (id: string, data: UpdateListRequest): ApiResponse<List> => {
  const response = await apiClient.put<List>(`/lists/${id}`, data);
  return response.data;
};

/**
 * Delete a list
 */
export const deleteList = async (id: string): ApiResponse<MessageResponse> => {
  const response = await apiClient.delete<MessageResponse>(`/lists/${id}`);
  return response.data;
};

/**
 * Add a member to list
 */
export const addListMember = async (
  listId: string,
  data: AddListMemberRequest
): ApiResponse<List> => {
  const response = await apiClient.post<List>(`/lists/${listId}/members`, data);
  return response.data;
};
