/**
 * ============================================
 * AUTH LAYOUT COMPONENT
 * Layout for authentication pages
 * ============================================
 */

import React from "react";
import { Outlet, Navigate } from "react-router";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store";

export const AuthLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthStore();

  // Redirect if already authenticated
  if (isAuthenticated && !isLoading) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-500 to-secondary-500 p-12 items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative z-10 max-w-lg text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <span className="text-white font-bold text-2xl">P</span>
              </div>
              <span className="font-bold text-3xl">Projex</span>
            </div>

            <h1 className="text-4xl font-bold mb-4">
              Manage your projects with ease
            </h1>
            <p className="text-lg text-white/80 mb-8">
              A powerful task management platform designed for teams and individuals.
              Organize, collaborate, and achieve your goals.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs">✓</span>
                </div>
                <p>Organize tasks with projects, lists, and labels</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs">✓</span>
                </div>
                <p>Collaborate with team members in real-time</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs">✓</span>
                </div>
                <p>Sync with Google Calendar for seamless scheduling</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <span className="font-bold text-2xl gradient-text">Projex</span>
          </div>

          <Outlet />
        </motion.div>
      </div>
    </div>
  );
};

export default AuthLayout;
