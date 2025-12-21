/**
 * ============================================
 * UI STORE
 * Manages UI state with Zustand
 * ============================================
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ToastMessage } from "@/types";
import { generateId } from "@/lib/utils";

interface ModalState {
  isOpen: boolean;
  type:
    | "task"
    | "taskDetail"
    | "project"
    | "list"
    | "label"
    | "confirm"
    | "search"
    | "member"
    | null;
  data?: unknown;
}

interface UIState {
  // Sidebar state
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Modal state
  modal: ModalState;

  // Toast notifications
  toasts: ToastMessage[];

  // Command palette
  commandPaletteOpen: boolean;

  // Selected items for bulk actions
  selectedTasks: string[];

  // Current view preferences
  taskView: "list" | "board" | "calendar";

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  openModal: (type: ModalState["type"], data?: unknown) => void;
  closeModal: () => void;

  addToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;

  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;

  setSelectedTasks: (tasks: string[]) => void;
  toggleTaskSelection: (taskId: string) => void;
  clearTaskSelection: () => void;

  setTaskView: (view: "list" | "board" | "calendar") => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      sidebarOpen: true,
      sidebarCollapsed: false,
      modal: {
        isOpen: false,
        type: null,
        data: undefined,
      },
      toasts: [],
      commandPaletteOpen: false,
      selectedTasks: [],
      taskView: "list",

      // Sidebar actions
      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      setSidebarOpen: (sidebarOpen) => {
        set({ sidebarOpen });
      },

      setSidebarCollapsed: (sidebarCollapsed) => {
        set({ sidebarCollapsed });
      },

      // Modal actions
      openModal: (type, data) => {
        set({
          modal: {
            isOpen: true,
            type,
            data,
          },
        });
      },

      closeModal: () => {
        set({
          modal: {
            isOpen: false,
            type: null,
            data: undefined,
          },
        });
      },

      // Toast actions
      addToast: (toast) => {
        const id = generateId();
        const newToast: ToastMessage = {
          ...toast,
          id,
          duration: toast.duration ?? 5000,
        };

        set((state) => ({
          toasts: [...state.toasts, newToast],
        }));

        // Auto-remove after duration
        if (newToast.duration && newToast.duration > 0) {
          setTimeout(() => {
            get().removeToast(id);
          }, newToast.duration);
        }
      },

      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },

      // Command palette actions
      toggleCommandPalette: () => {
        set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen }));
      },

      setCommandPaletteOpen: (commandPaletteOpen) => {
        set({ commandPaletteOpen });
      },

      // Task selection actions
      setSelectedTasks: (selectedTasks) => {
        set({ selectedTasks });
      },

      toggleTaskSelection: (taskId) => {
        set((state) => {
          const isSelected = state.selectedTasks.includes(taskId);
          return {
            selectedTasks: isSelected
              ? state.selectedTasks.filter((id) => id !== taskId)
              : [...state.selectedTasks, taskId],
          };
        });
      },

      clearTaskSelection: () => {
        set({ selectedTasks: [] });
      },

      // View preferences
      setTaskView: (taskView) => {
        set({ taskView });
      },
    }),
    {
      name: "projex-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist view preferences
        sidebarCollapsed: state.sidebarCollapsed,
        taskView: state.taskView,
      }),
    }
  )
);

// Helper hook for toasts
export const useToast = () => {
  const { addToast, removeToast, toasts } = useUIStore();

  return {
    toasts,
    toast: {
      success: (title: string, description?: string) =>
        addToast({ type: "success", title, description }),
      error: (title: string, description?: string) =>
        addToast({ type: "error", title, description }),
      warning: (title: string, description?: string) =>
        addToast({ type: "warning", title, description }),
      info: (title: string, description?: string) =>
        addToast({ type: "info", title, description }),
    },
    dismiss: removeToast,
  };
};
