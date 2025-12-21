/**
 * ============================================
 * GOOGLE CALENDAR API ENDPOINTS
 * ============================================
 */

import apiClient, { type ApiResponse } from "./client";
import type { MessageResponse } from "@/types";

interface AuthUrlResponse {
  authUrl: string;
}

interface SyncTaskResponse {
  message: string;
  eventId: string;
}

/**
 * Get Google Calendar authorization URL
 */
export const getAuthUrl = async (): ApiResponse<AuthUrlResponse> => {
  const response = await apiClient.get<AuthUrlResponse>("/google-calendar/auth");
  return response.data;
};

/**
 * Sync a task to Google Calendar
 */
export const syncTaskToCalendar = async (taskId: string): ApiResponse<SyncTaskResponse> => {
  const response = await apiClient.post<SyncTaskResponse>(`/google-calendar/sync-task/${taskId}`);
  return response.data;
};

/**
 * Remove a task from Google Calendar
 */
export const unsyncTaskFromCalendar = async (taskId: string): ApiResponse<MessageResponse> => {
  const response = await apiClient.delete<MessageResponse>(
    `/google-calendar/unsync-task/${taskId}`
  );
  return response.data;
};

/**
 * Disconnect Google Calendar
 */
export const disconnectGoogleCalendar = async (): ApiResponse<MessageResponse> => {
  const response = await apiClient.delete<MessageResponse>("/google-calendar/disconnect");
  return response.data;
};
