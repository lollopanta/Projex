/**
 * ============================================
 * APP LAYOUT COMPONENT
 * Main application layout with sidebar and topbar
 * ============================================
 */

import React from "react";
import { Outlet } from "react-router";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Toaster } from "@/components/common/Toaster";
import { CommandPalette } from "@/components/common/CommandPalette";
import { MaintenanceBanner } from "@/components/common/MaintenanceBanner";
import {
  CreateProjectModal,
  CreateTaskModal,
  CreateListModal,
  CreateLabelModal,
  TaskDetailModal,
} from "@/components/modals";

export const AppLayout: React.FC = () => {
  const { sidebarOpen, sidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen bg-background">
      {/* Maintenance Banner */}
      <MaintenanceBanner />
      
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div
        className={cn(
          "transition-all duration-200",
          sidebarOpen
            ? sidebarCollapsed
              ? "lg:ml-16"
              : "lg:ml-64"
            : "ml-0"
        )}
      >
        {/* Topbar */}
        <Topbar />

        {/* Page Content */}
        <main className={cn("p-4 lg:p-6", "transition-all")}>
          <Outlet />
        </main>
      </div>

      {/* Global Components */}
      <Toaster />
      <CommandPalette />
      
      {/* Modals */}
      <CreateProjectModal />
      <CreateTaskModal />
      <CreateListModal />
      <CreateLabelModal />
      <TaskDetailModal />
    </div>
  );
};

export default AppLayout;
