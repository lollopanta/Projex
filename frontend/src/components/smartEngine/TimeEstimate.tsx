/**
 * ============================================
 * TIME ESTIMATE COMPONENT
 * Shows estimated time for a task
 * ============================================
 */

import React from "react";
import { useTimeEstimate } from "@/hooks/useSmartEngine";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock } from "@fortawesome/free-regular-svg-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TimeEstimateProps {
  taskId: string;
  userId?: string;
  projectId?: string;
  className?: string;
}

export const TimeEstimate: React.FC<TimeEstimateProps> = ({
  taskId,
  userId,
  projectId,
  className,
}) => {
  const { data: estimate, isLoading } = useTimeEstimate(taskId, userId, projectId);

  if (isLoading) {
    return (
      <span className={cn("text-sm text-muted-foreground animate-pulse", className)}>
        Estimating...
      </span>
    );
  }

  if (!estimate) {
    return null;
  }

  const hours = Math.floor(estimate.estimatedMinutes / 60);
  const minutes = estimate.estimatedMinutes % 60;
  const timeString = hours > 0 
    ? `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim()
    : `${minutes}m`;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.5) return "text-yellow-600";
    return "text-orange-600";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1.5 text-sm", className)}>
            <FontAwesomeIcon icon={faClock} className={cn("w-4 h-4", getConfidenceColor(estimate.confidenceLevel))} />
            <span className={getConfidenceColor(estimate.confidenceLevel)}>
              {timeString}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{estimate.explanation}</p>
            {estimate.basedOn.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Based on: {estimate.basedOn.join(", ")}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Confidence: {Math.round(estimate.confidenceLevel * 100)}% ({estimate.sampleSize} samples)
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
