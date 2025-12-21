/**
 * ============================================
 * AXIOS CLIENT CONFIGURATION
 * Central API client with interceptors
 * ============================================
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import type { ErrorResponse } from "@/types";

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: "/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Token management
const TOKEN_KEY = "projex_token";

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorResponse>) => {
    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      removeToken();
      
      // Only redirect if not already on auth pages
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith("/login") && !currentPath.startsWith("/register")) {
        window.location.href = "/login";
      }
    }

    // Extract error message
    const message = error.response?.data?.message || error.message || "An error occurred";
    
    // Create a standardized error
    const standardError = new Error(message) as Error & {
      status?: number;
      errors?: ErrorResponse["errors"];
    };
    standardError.status = error.response?.status;
    standardError.errors = error.response?.data?.errors;

    return Promise.reject(standardError);
  }
);

export default apiClient;

// Type helper for API responses
export type ApiResponse<T> = Promise<T>;
