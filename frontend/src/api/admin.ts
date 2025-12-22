/**
 * ============================================
 * ADMIN API ENDPOINTS
 * ============================================
 */

import apiClient, { type ApiResponse } from "./client";
import type { SiteSettings, AdminStats } from "@/types";

/**
 * Get site settings (admin only)
 */
export const getSiteSettings = async (): ApiResponse<SiteSettings> => {
  const response = await apiClient.get<SiteSettings>("/admin/settings");
  return response.data;
};

/**
 * Update site settings (admin only)
 */
export const updateSiteSettings = async (
  data: Partial<SiteSettings>
): ApiResponse<{ message: string; settings: SiteSettings }> => {
  const response = await apiClient.put<{ message: string; settings: SiteSettings }>(
    "/admin/settings",
    data
  );
  return response.data;
};

/**
 * Get admin statistics (admin only)
 */
export const getAdminStats = async (): ApiResponse<AdminStats> => {
  const response = await apiClient.get<AdminStats>("/admin/stats");
  return response.data;
};
