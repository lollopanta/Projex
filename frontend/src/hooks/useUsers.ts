/**
 * ============================================
 * USERS HOOKS
 * TanStack Query hooks for user operations
 * ============================================
 */

import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/api";

// Query keys
export const userKeys = {
  all: ["users"] as const,
  search: (query: string) => [...userKeys.all, "search", query] as const,
  detail: (id: string) => [...userKeys.all, "detail", id] as const,
};

/**
 * Hook to search users
 */
export const useSearchUsers = (query: string) => {
  return useQuery({
    queryKey: userKeys.search(query),
    queryFn: () => usersApi.searchUsers(query),
    enabled: query.length >= 2,
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Hook to get a user by ID
 */
export const useUser = (id: string) => {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => usersApi.getUserById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
