/**
 * ============================================
 * AUTH API ENDPOINTS
 * ============================================
 */

import apiClient, { type ApiResponse } from "./client";
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  TwoFactorSetupResponse,
  MessageResponse,
  User,
} from "@/types";

/**
 * Register a new user
 */
export const register = async (data: RegisterRequest): ApiResponse<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>("/auth/register", data);
  return response.data;
};

/**
 * Login user
 */
export const login = async (data: LoginRequest): ApiResponse<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>("/auth/login", data);
  return response.data;
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): ApiResponse<User> => {
  const response = await apiClient.get<User>("/auth/me");
  return response.data;
};

/**
 * Enable 2FA - Get QR code and secret
 */
export const enable2FA = async (): ApiResponse<TwoFactorSetupResponse> => {
  const response = await apiClient.post<TwoFactorSetupResponse>("/auth/enable-2fa");
  return response.data;
};

/**
 * Verify and complete 2FA setup
 */
export const verify2FA = async (token: string): ApiResponse<MessageResponse> => {
  const response = await apiClient.post<MessageResponse>("/auth/verify-2fa", { token });
  return response.data;
};

/**
 * Disable 2FA
 */
export const disable2FA = async (password: string): ApiResponse<MessageResponse> => {
  const response = await apiClient.post<MessageResponse>("/auth/disable-2fa", { password });
  return response.data;
};
