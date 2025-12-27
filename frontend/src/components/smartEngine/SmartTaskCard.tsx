/**
 * ============================================
 * SMART TASK CARD
 * Task card with Smart Engine priority integration
 * ============================================
 */

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { SmartPriorityBadge } from "./SmartPriorityBadge";
import { TimeEstimate } from "./TimeEstimate";
import { cn } from "@/lib/utils";
import type { TaskPopulated } from "@/types";
import type { PriorityResult } from "@/api/smartEngine";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar, faUser } from "@fortawesome/free-regular-svg-icons";
import { faTag } from "@fortawesome/free-solid-svg-icons";
import { useUIStore } from "@/store";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

interface SmartTaskCardProps {
  task: TaskPopulated;
  priority: PriorityResult | null;
  priorityLoading?: boolean;
  projectId?: string;
  onToggleComplete?: (taskId: string, completed: boolean) => void;
  onMarkHandled?: (taskId: string) => void;
  isHandled?: boolean;
  className?: string;
}

export const SmartTaskCard: React.FC<SmartTaskCardProps> = ({
  task,
  priority,
  priorityLoading = false,
  projectId,
  onToggleComplete,
  onMarkHandled,
  isHandled = false,
  className,
}) => {
  const { openModal } = useUIStore();

  const handleToggleComplete = (checked: boolean) => {
    if (onToggleComplete) {
      onToggleComplete(task._id, checked);
    }
  };

  const handleMarkHandled = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (onMarkHandled) {
      onMarkHandled(task._id);
    }
  };

  const handleCardClick = () => {
    openModal("taskDetail", task);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking checkbox
  };

  // Calculate percent complete
  const percentComplete = task.percentDone || (task.completed ? 100 : 0);

  // Get assignee IDs for time estimate
  const assigneeIds = task.assignedTo?.map((u) =>
    typeof u === "object" ? u._id : u
  ) || [];
  const firstAssigneeId = assigneeIds.length > 0 ? assigneeIds[0] : undefined;

  // Get project ID
  const taskProjectId =
    projectId ||
    (task.project
      ? typeof task.project === "object"
        ? task.project._id
        : task.project
      : undefined);

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md cursor-pointer",
        isHandled && "opacity-60",
        className
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Completion Checkbox */}
          <Checkbox
            checked={task.completed}
            onCheckedChange={handleToggleComplete}
            onClick={handleCheckboxClick}
            className="mt-1"
            aria-label={`Mark "${task.title}" as ${task.completed ? "incomplete" : "complete"}`}
          />

          {/* Task Content */}
          <div className="flex-1 space-y-2">
            {/* Title and Priority */}
            <div className="flex items-start justify-between gap-2">
              <h3
                className={cn(
                  "font-semibold text-sm leading-tight",
                  task.completed && "line-through text-muted-foreground"
                )}
              >
                {task.title}
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <SmartPriorityBadge
                  priority={priority}
                  isLoading={priorityLoading}
                />
                {onMarkHandled && !isHandled && (
                  <button
                    onClick={handleMarkHandled}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
                    title="Mark as handled (hide from urgent list)"
                  >
                    Hide
                  </button>
                )}
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Metadata Row */}
            <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
              {/* Due Date */}
              {task.dueDate && (
                <div className="flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faCalendar} className="w-3 h-3" />
                  <span>
                    {dayjs(task.dueDate).format("MMM D, YYYY")}
                    {dayjs.utc(task.dueDate).isBefore(dayjs.utc(), "day") && (
                      <span className="text-red-500 ml-1">(Overdue)</span>
                    )}
                  </span>
                </div>
              )}

              {/* Assignees */}
              {task.assignedTo && task.assignedTo.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faUser} className="w-3 h-3" />
                  <span>
                    {task.assignedTo.length === 1
                      ? typeof task.assignedTo[0] === "object"
                        ? task.assignedTo[0].username || task.assignedTo[0].firstName
                        : "Assigned"
                      : `${task.assignedTo.length} assignees`}
                  </span>
                </div>
              )}

              {/* Labels */}
              {task.labels && task.labels.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faTag} className="w-3 h-3" />
                  <span>{task.labels.length} label{task.labels.length !== 1 ? "s" : ""}</span>
                </div>
              )}

              {/* Time Estimate */}
              {firstAssigneeId && (
                <TimeEstimate
                  taskId={task._id}
                  userId={firstAssigneeId}
                  projectId={taskProjectId}
                />
              )}
            </div>

            {/* Progress Bar */}
            {percentComplete > 0 && percentComplete < 100 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{percentComplete}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${percentComplete}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
