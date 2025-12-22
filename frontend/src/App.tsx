/**
 * ============================================
 * PROJEX APP
 * Main application component with routing
 * ============================================
 */

import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// Layouts
import { AppLayout, AuthLayout } from "@/components/layout";
import { ProtectedRoute } from "@/components/common";

// Auth Pages
import { LoginPage, RegisterPage } from "@/pages/auth";
import { VerifyEmailPage } from "@/pages/auth/VerifyEmailPage";

// App Pages
import { DashboardPage } from "@/pages/dashboard";
import { SettingsPage } from "@/pages/settings";
import { InboxPage, TodayPage, UpcomingPage } from "@/pages/tasks";
import { ProjectsPage, ProjectDetailPage } from "@/pages/projects";
import { ListDetailPage } from "@/pages/lists";
import { LabelsPage } from "@/pages/labels";
import { BackupPage } from "@/pages/backup";
import { ProfilePage } from "@/pages/profile";

// Store
import { useAuthStore } from "@/store";
// Hooks
import { useCurrentUser } from "@/hooks";

// Query Client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Theme initialization component
const ThemeInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuthStore();
  const { data: currentUser } = useCurrentUser();

  useEffect(() => {
    // Initialize theme based on user preference from backend
    // Priority: currentUser (fresh from API) > user (from store) > default
    const theme = currentUser?.theme || user?.theme || "light";
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [user?.theme, currentUser?.theme, token]);

  return <>{children}</>;
};

// All pages are now imported from their respective modules

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer>
        <BrowserRouter>
          <Routes>
            {/* Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
            </Route>

            {/* Protected App Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Dashboard */}
              <Route path="/" element={<DashboardPage />} />
              
              {/* Task Views */}
              <Route path="/inbox" element={<InboxPage />} />
              <Route path="/today" element={<TodayPage />} />
              <Route path="/upcoming" element={<UpcomingPage />} />

              {/* Projects */}
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />

              {/* Lists */}
              <Route path="/lists/:id" element={<ListDetailPage />} />

              {/* Labels */}
              <Route path="/labels" element={<LabelsPage />} />

              {/* Settings */}
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* Backup */}
              <Route path="/backup" element={<BackupPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeInitializer>

      {/* React Query Devtools (only in development) */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
