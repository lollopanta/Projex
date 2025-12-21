/**
 * ============================================
 * PROTECTED ROUTE COMPONENT
 * Guards routes that require authentication
 * ============================================
 */

import React from "react";
import { Navigate, useLocation } from "react-router";
import { useAuthStore } from "@/store";
import { useCurrentUser } from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  
  // Fetch current user if authenticated but no user data
  const { isLoading: userLoading } = useCurrentUser();

  // Show loading state
  if (isLoading || (isAuthenticated && userLoading && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-pulse">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check admin requirement
  if (requireAdmin && user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
