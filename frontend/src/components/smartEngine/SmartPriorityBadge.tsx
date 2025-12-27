/**
 * ============================================
 * SMART PRIORITY BADGE
 * Displays priority score with color coding and tooltip
 * ============================================
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PriorityResult } from "@/api/smartEngine";

interface SmartPriorityBadgeProps {
  priority: PriorityResult | null;
  isLoading?: boolean;
  className?: string;
}

/**
 * Get priority level from score (0-100)
 */
const getPriorityLevel = (score: number): "low" | "medium" | "high" => {
  if (score >= 67) return "high";
  if (score >= 34) return "medium";
  return "low";
};

/**
 * Get color class based on priority score
 */
const getPriorityColor = (score: number): string => {
  if (score >= 67) return "bg-red-500 hover:bg-red-600 text-white";
  if (score >= 34) return "bg-yellow-500 hover:bg-yellow-600 text-white";
  return "bg-green-500 hover:bg-green-600 text-white";
};

export const SmartPriorityBadge: React.FC<SmartPriorityBadgeProps> = ({
  priority,
  isLoading = false,
  className,
}) => {
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

  const level = getPriorityLevel(priority.priorityScore);
  const colorClass = getPriorityColor(priority.priorityScore);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className={cn(
              "cursor-help transition-all shadow-sm",
              colorClass,
              className
            )}
          >
            {level === "high" ? "High" : level === "medium" ? "Medium" : "Low"} ({priority.priorityScore})
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold text-sm">{priority.explanation}</p>
            {priority.reasons.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1 text-muted-foreground">Reasons:</p>
                <ul className="list-disc list-inside text-xs space-y-0.5">
                  {priority.reasons.map((reason, idx) => (
                    <li key={idx} className="text-foreground">{reason}</li>
                  ))}
                </ul>
              </div>
            )}
            {priority.factors && priority.factors.length > 0 && (
              <div className="pt-1 border-t">
                <p className="text-xs font-medium mb-1 text-muted-foreground">Factors:</p>
                <div className="space-y-1">
                  {priority.factors
                    .filter((f) => f.impact !== "neutral")
                    .map((factor, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-medium capitalize">{factor.factor}:</span>{" "}
                        <span className="text-muted-foreground">{factor.impact}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
