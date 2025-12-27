/**
 * ============================================
 * PRIORITY BADGE COMPONENT
 * Shows task priority with Smart Engine score
 * ============================================
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTaskPriority } from "@/hooks/useSmartEngine";
import type { TaskPopulated } from "@/types";
import { cn } from "@/lib/utils";

interface PriorityBadgeProps {
  task: TaskPopulated;
  projectId?: string;
  className?: string;
}

export const SmartPriorityBadge: React.FC<PriorityBadgeProps> = ({
  task,
  projectId,
  className,
}) => {
  const assigneeIds = task.assignedTo?.map(u => typeof u === 'object' ? u._id : u) || [];
  
  const { data: priority, isLoading } = useTaskPriority(
    task._id,
    projectId || (task.project ? (typeof task.project === 'object' ? task.project._id : task.project) : undefined),
    assigneeIds.length > 0 ? assigneeIds : undefined
  );

  if (isLoading) {
    return (
      <Badge variant="outline" className={cn("animate-pulse", className)}>
        Calculating...
      </Badge>
    );
  }

  if (!priority) {
    return null;
  }

  // Determine color based on priority score
  const getPriorityColor = (score: number) => {
    if (score >= 80) return "bg-red-500 text-white";
    if (score >= 60) return "bg-orange-500 text-white";
    if (score >= 40) return "bg-yellow-500 text-white";
    if (score >= 20) return "bg-blue-500 text-white";
    return "bg-gray-500 text-white";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className={cn(getPriorityColor(priority.priorityScore), className)}
          >
            Priority: {priority.priorityScore}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{priority.explanation}</p>
            {priority.reasons.length > 0 && (
              <ul className="list-disc list-inside text-sm space-y-0.5">
                {priority.reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
