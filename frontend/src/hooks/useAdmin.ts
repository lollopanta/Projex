/**
 * ============================================
 * ADMIN HOOKS
 * TanStack Query hooks for admin operations
 * ============================================
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/api";
import { useToast } from "@/store";
import type { SiteSettings, UpdateSiteSettingsRequest, AdminStats } from "@/types";

// Query keys
export const adminKeys = {
  all: ["admin"] as const,
  settings: () => [...adminKeys.all, "settings"] as const,
  stats: () => [...adminKeys.all, "stats"] as const,
};

/**
 * Hook to get site settings (admin only)
 */
export const useSiteSettings = () => {
  return useQuery({
    queryKey: adminKeys.settings(),
    queryFn: () => adminApi.getSiteSettings(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to update site settings (admin only)
 */
export const useUpdateSiteSettings = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: UpdateSiteSettingsRequest) => adminApi.updateSiteSettings(data),
    onMutate: async (newSettings) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: adminKeys.settings() });

      // Snapshot previous value
      const previousSettings = queryClient.getQueryData<SiteSettings>(adminKeys.settings());

      // Optimistically update
      if (previousSettings) {
        queryClient.setQueryData<SiteSettings>(adminKeys.settings(), {
          ...previousSettings,
          ...newSettings,
        });
      }

      return { previousSettings };
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousSettings) {
        queryClient.setQueryData(adminKeys.settings(), context.previousSettings);
      }
      toast.error("Failed to update settings", error.message);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(adminKeys.settings(), data.settings);
      toast.success("Settings updated", "Site settings have been saved");
    },
  });
};

/**
 * Hook to get admin statistics (admin only)
 */
export const useAdminStats = () => {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: () => adminApi.getAdminStats(),
    staleTime: 1000 * 60, // 1 minute
  });
};
