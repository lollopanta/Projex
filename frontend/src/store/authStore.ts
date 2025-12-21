/**
 * ============================================
 * AUTH STORE
 * Manages authentication state with Zustand
 * ============================================
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User, Theme } from "@/types";
import { getToken, setToken, removeToken } from "@/api/client";

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requires2FA: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setRequires2FA: (requires: boolean) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setTheme: (theme: Theme) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: getToken(),
      isAuthenticated: !!getToken(),
      isLoading: true,
      requires2FA: false,

      // Actions
      setUser: (user) => {
        set({ user, isAuthenticated: !!user, isLoading: false });
      },

      setToken: (token) => {
        if (token) {
          setToken(token);
        } else {
          removeToken();
        }
        set({ token, isAuthenticated: !!token });
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      setRequires2FA: (requires2FA) => {
        set({ requires2FA });
      },

      login: (user, token) => {
        setToken(token);
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          requires2FA: false,
        });

        // Apply user theme
        if (user.theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      },

      logout: () => {
        removeToken();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          requires2FA: false,
        });
      },

      updateUser: (updates) => {
        const { user } = get();
        if (user) {
          const updatedUser = { ...user, ...updates };
          set({ user: updatedUser });

          // Apply theme change
          if (updates.theme) {
            if (updates.theme === "dark") {
              document.documentElement.classList.add("dark");
            } else {
              document.documentElement.classList.remove("dark");
            }
          }
        }
      },

      setTheme: (theme) => {
        const { user, updateUser } = get();
        if (user) {
          updateUser({ theme });
        }
        // Also apply immediately
        if (theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      },
    }),
    {
      name: "projex-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist user data, not loading states
        user: state.user,
      }),
    }
  )
);
