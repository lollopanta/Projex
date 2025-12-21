/**
 * ============================================
 * TOASTER COMPONENT
 * Global toast notification container
 * ============================================
 */

import React from "react";
import { useUIStore } from "@/store";
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastIcon,
} from "@/components/ui/toast";

export const Toaster: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  return (
    <ToastProvider>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.type}
          onOpenChange={(open) => !open && removeToast(toast.id)}
        >
          <ToastIcon variant={toast.type} />
          <div className="flex-1">
            <ToastTitle>{toast.title}</ToastTitle>
            {toast.description && (
              <ToastDescription>{toast.description}</ToastDescription>
            )}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
};

export default Toaster;
