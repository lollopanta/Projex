/**
 * ============================================
 * MAINTENANCE BANNER
 * Displays maintenance mode message
 * ============================================
 */

import React from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { useSiteSettings } from "@/hooks";
import { cn } from "@/lib/utils";

export const MaintenanceBanner: React.FC = () => {
  const { data: settings } = useSiteSettings();

  if (!settings?.maintenanceMode) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 p-4 bg-yellow-500 dark:bg-yellow-600",
        "border-b-2 border-yellow-600 dark:border-yellow-700",
        "shadow-lg"
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center gap-3 text-yellow-900 dark:text-yellow-100">
        <FontAwesomeIcon icon={faExclamationTriangle} className="w-5 h-5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold">Maintenance Mode Active</p>
          <p className="text-sm">{settings.maintenanceMessage}</p>
        </div>
      </div>
    </motion.div>
  );
};
