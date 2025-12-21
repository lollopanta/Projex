/**
 * ============================================
 * BACKUP API ENDPOINTS
 * ============================================
 */

import apiClient, { type ApiResponse } from "./client";
import type { BackupData, ImportBackupRequest, MessageResponse } from "@/types";

/**
 * Export user data as backup
 */
export const exportBackup = async (): ApiResponse<BackupData> => {
  const response = await apiClient.get<BackupData>("/backup/export");
  return response.data;
};

/**
 * Import user data from backup
 */
export const importBackup = async (data: ImportBackupRequest): ApiResponse<MessageResponse> => {
  const response = await apiClient.post<MessageResponse>("/backup/import", data);
  return response.data;
};

/**
 * Download backup as file
 */
export const downloadBackup = async (): Promise<void> => {
  const backup = await exportBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `projex-backup-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
