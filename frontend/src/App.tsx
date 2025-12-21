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

// App Pages
import { DashboardPage } from "@/pages/dashboard";
import { SettingsPage } from "@/pages/settings";

// Store
import { useAuthStore } from "@/store";

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
  const { user } = useAuthStore();

  useEffect(() => {
    // Initialize theme based on user preference or system preference
    const theme = user?.theme || "light";
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [user?.theme]);

  return <>{children}</>;
};

// Placeholder pages for routes that need implementation
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex flex-col items-center justify-center py-20">
    <h1 className="text-2xl font-bold mb-2">{title}</h1>
    <p className="text-muted-foreground">This page is coming soon</p>
  </div>
);

const InboxPage = () => <PlaceholderPage title="Inbox" />;
const TodayPage = () => <PlaceholderPage title="Today's Tasks" />;
const UpcomingPage = () => <PlaceholderPage title="Upcoming Tasks" />;
const ProjectsPage = () => <PlaceholderPage title="All Projects" />;
const ProjectDetailPage = () => <PlaceholderPage title="Project Detail" />;
const ListDetailPage = () => <PlaceholderPage title="List Detail" />;
const LabelsPage = () => <PlaceholderPage title="Labels" />;
const BackupPage = () => <PlaceholderPage title="Backup & Restore" />;
const ProfilePage = () => <PlaceholderPage title="Profile" />;

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
