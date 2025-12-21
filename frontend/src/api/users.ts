/**
 * ============================================
 * USERS API ENDPOINTS
 * ============================================
 */

import apiClient, { type ApiResponse } from "./client";
import type { User, UserPublic, UpdateProfileRequest } from "@/types";

/**
 * Search users (for assignments)
 */
export const searchUsers = async (query: string): ApiResponse<UserPublic[]> => {
  const response = await apiClient.get<UserPublic[]>("/users/search", {
    params: { q: query },
  });
  return response.data;
};

/**
 * Get user by ID
 */
export const getUserById = async (id: string): ApiResponse<User> => {
  const response = await apiClient.get<User>(`/users/${id}`);
  return response.data;
};

/**
 * Update user profile
 */
export const updateProfile = async (data: UpdateProfileRequest): ApiResponse<User> => {
  const response = await apiClient.put<User>("/users/profile", data);
  return response.data;
};
