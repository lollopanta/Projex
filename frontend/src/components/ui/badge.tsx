/**
 * ============================================
 * BADGE COMPONENT
 * Status badges and tags
 * ============================================
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow",
        outline: "text-foreground",
        success:
          "border-transparent bg-success-500/10 text-success-700 dark:text-success-500",
        warning:
          "border-transparent bg-warning-500/10 text-warning-700 dark:text-warning-500",
        danger:
          "border-transparent bg-danger-500/10 text-danger-700 dark:text-danger-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

// Priority badge component
interface PriorityBadgeProps {
  priority: "low" | "medium" | "high";
  className?: string;
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className }) => {
  const variants: Record<string, VariantProps<typeof badgeVariants>["variant"]> = {
    low: "success",
    medium: "warning",
    high: "danger",
  };

  const labels: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
  };

  return (
    <Badge variant={variants[priority]} className={className}>
      {labels[priority]}
    </Badge>
  );
};

// Role badge component
interface RoleBadgeProps {
  role: "viewer" | "editor" | "admin" | "owner";
  className?: string;
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ role, className }) => {
  const variants: Record<string, VariantProps<typeof badgeVariants>["variant"]> = {
    viewer: "secondary",
    editor: "default",
    admin: "destructive",
    owner: "destructive",
  };

  const labels: Record<string, string> = {
    viewer: "Viewer",
    editor: "Editor",
    admin: "Admin",
    owner: "Owner",
  };

  return (
    <Badge variant={variants[role]} className={className}>
      {labels[role]}
    </Badge>
  );
};

// Label badge component
interface LabelBadgeProps {
  name: string;
  color: string;
  className?: string;
  onRemove?: () => void;
}

const LabelBadge: React.FC<LabelBadgeProps> = ({ name, color, className, onRemove }) => {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white",
        className
      )}
      style={{ backgroundColor: color }}
    >
      {name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:opacity-70 transition-opacity"
          aria-label={`Remove ${name} label`}
        >
          ×
        </button>
      )}
    </div>
  );
};

export { Badge, badgeVariants, PriorityBadge, RoleBadge, LabelBadge };
