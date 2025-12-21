/**
 * ============================================
 * AUTH HOOKS
 * TanStack Query hooks for authentication
 * ============================================
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api";
import { useAuthStore, useToast } from "@/store";
import type { LoginRequest, RegisterRequest, UpdateProfileRequest } from "@/types";
import { usersApi } from "@/api";

// Query keys
export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

/**
 * Hook to get current user data
 */
export const useCurrentUser = () => {
  const { token, setUser, setLoading, logout } = useAuthStore();

  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async () => {
      const user = await authApi.getCurrentUser();
      setUser(user);
      return user;
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
    meta: {
      onError: () => {
        logout();
        setLoading(false);
      },
    },
  });
};

/**
 * Hook for user login
 */
export const useLogin = () => {
  const { login, setRequires2FA } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (response) => {
      login(
        {
          ...response.user,
          _id: response.user.id,
          role: "user",
          twoFactorEnabled: response.user.twoFactorEnabled ?? false,
          preferences: {
            emailNotifications: true,
            pushNotifications: true,
            defaultReminderTime: 24,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        response.token
      );
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      toast.success("Welcome back!", `Logged in as ${response.user.username}`);
    },
    onError: (error: Error & { status?: number }) => {
      if (error.message === "Two-factor authentication required") {
        setRequires2FA(true);
      } else {
        toast.error("Login failed", error.message);
      }
    },
  });
};

/**
 * Hook for user registration
 */
export const useRegister = () => {
  const { login } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: (response) => {
      login(
        {
          ...response.user,
          _id: response.user.id,
          role: "user",
          twoFactorEnabled: false,
          preferences: {
            emailNotifications: true,
            pushNotifications: true,
            defaultReminderTime: 24,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        response.token
      );
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      toast.success("Welcome to Projex!", "Your account has been created");
    },
    onError: (error: Error) => {
      toast.error("Registration failed", error.message);
    },
  });
};

/**
 * Hook for updating user profile
 */
export const useUpdateProfile = () => {
  const { updateUser } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => usersApi.updateProfile(data),
    onSuccess: (user) => {
      updateUser(user);
      queryClient.setQueryData(authKeys.me(), user);
      toast.success("Profile updated", "Your changes have been saved");
    },
    onError: (error: Error) => {
      toast.error("Update failed", error.message);
    },
  });
};

/**
 * Hook for enabling 2FA
 */
export const useEnable2FA = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => authApi.enable2FA(),
    onError: (error: Error) => {
      toast.error("2FA setup failed", error.message);
    },
  });
};

/**
 * Hook for verifying 2FA
 */
export const useVerify2FA = () => {
  const { updateUser } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => authApi.verify2FA(token),
    onSuccess: () => {
      updateUser({ twoFactorEnabled: true });
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      toast.success("2FA enabled", "Your account is now more secure");
    },
    onError: (error: Error) => {
      toast.error("Verification failed", error.message);
    },
  });
};

/**
 * Hook for disabling 2FA
 */
export const useDisable2FA = () => {
  const { updateUser } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (password: string) => authApi.disable2FA(password),
    onSuccess: () => {
      updateUser({ twoFactorEnabled: false });
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      toast.success("2FA disabled", "Two-factor authentication has been turned off");
    },
    onError: (error: Error) => {
      toast.error("Failed to disable 2FA", error.message);
    },
  });
};

/**
 * Hook for logging out
 */
export const useLogout = () => {
  const { logout } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return () => {
    logout();
    queryClient.clear();
    toast.info("Logged out", "You have been signed out");
  };
};
