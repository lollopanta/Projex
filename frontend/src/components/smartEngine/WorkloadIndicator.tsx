/**
 * ============================================
 * WORKLOAD INDICATOR COMPONENT
 * Shows user workload status
 * ============================================
 */

import React from "react";
import { useUserWorkload } from "@/hooks/useSmartEngine";
import { Badge } from "@/components/ui/badge";
// Progress component - using a simple div if not available
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface WorkloadIndicatorProps {
  userId: string;
  showDetails?: boolean;
  className?: string;
}

export const WorkloadIndicator: React.FC<WorkloadIndicatorProps> = ({
  userId,
  showDetails = false,
  className,
}) => {
  const { data: workload, isLoading } = useUserWorkload(userId);

  if (isLoading) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-4 w-20 bg-muted rounded" />
      </div>
    );
  }

  if (!workload) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "overload":
        return "bg-red-500";
      case "warning":
        return "bg-orange-500";
      case "balanced":
        return "bg-green-500";
      case "underutilized":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusVariant = (status: string): "default" | "destructive" | "secondary" => {
    switch (status) {
      case "overload":
        return "destructive";
      case "warning":
        return "default";
      default:
        return "secondary";
    }
  };

  if (showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("space-y-2", className)}>
              <div className="flex items-center justify-between text-sm">
                <span>{workload.userName}</span>
                <Badge variant={getStatusVariant(workload.status)}>
                  {workload.status}
                </Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={cn("h-2 rounded-full transition-all", getStatusColor(workload.status))}
                  style={{ width: `${Math.min(100, workload.loadPercentage)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {workload.loadPercentage}% capacity ({workload.assignedTaskCount} tasks)
              </p>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1">
              <p className="font-semibold">{workload.explanation}</p>
              {workload.warnings.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-orange-600">Warnings:</p>
                  <ul className="list-disc list-inside text-xs">
                    {workload.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
              {workload.suggestions.length > 0 && (
                <div>
                  <p className="text-sm font-medium">Suggestions:</p>
                  <ul className="list-disc list-inside text-xs">
                    {workload.suggestions.map((suggestion, idx) => (
                      <li key={idx}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-2", className)}>
            <div className={cn("w-3 h-3 rounded-full", getStatusColor(workload.status))} />
            <span className="text-sm">{workload.loadPercentage}%</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{workload.explanation}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
