/**
 * ============================================
 * TASK LIST COMPONENT
 * Reusable component for displaying a list of tasks
 * ============================================
 */

import React from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faClock } from "@fortawesome/free-solid-svg-icons";
import { useUIStore } from "@/store";
import { useToggleTaskComplete } from "@/hooks/useTasks";
import { PriorityBadge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { cn, isOverdue } from "@/lib/utils";
import type { TaskPopulated } from "@/types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

interface TaskListProps {
  tasks: TaskPopulated[];
  showCompleted?: boolean;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, showCompleted = true }) => {
  const { openModal } = useUIStore();
  const toggleComplete = useToggleTaskComplete();

  const displayTasks = showCompleted
    ? tasks
    : tasks.filter((t) => !t.completed);

  if (displayTasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No tasks to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayTasks.map((task) => {
        const overdue = task.dueDate && isOverdue(task.dueDate) && !task.completed;

        return (
          <motion.div
            key={task._id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer group",
              task.completed && "opacity-60"
            )}
            onClick={() => openModal("taskDetail", task)}
          >
            <button
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                task.completed
                  ? "bg-primary border-primary text-white"
                  : "border-muted-foreground hover:border-primary"
              )}
              onClick={(e) => {
                e.stopPropagation();
                toggleComplete.mutate(task._id);
              }}
              disabled={toggleComplete.isPending}
            >
              {task.completed && (
                <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "font-medium truncate",
                  task.completed && "line-through text-muted-foreground"
                )}
              >
                {task.title}
              </p>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {task.dueDate && (
                  <span
                    className={cn(
                      "text-xs flex items-center gap-1 px-2 py-0.5 rounded",
                      overdue
                        ? "text-destructive bg-destructive/10"
                        : "text-muted-foreground bg-muted"
                    )}
                  >
                    <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
                    {dayjs(task.dueDate).fromNow()}
                  </span>
                )}
                {task.project && (
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${task.project.color}20`,
                      color: task.project.color,
                    }}
                  >
                    {task.project.name}
                  </span>
                )}
                {task.list && (
                  <span
                    className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
                  >
                    {task.list.name}
                  </span>
                )}
                <PriorityBadge priority={task.priority} />
                {task.labels && task.labels.length > 0 && (
                  <div className="flex gap-1">
                    {task.labels.slice(0, 3).map((label) => (
                      <span
                        key={label._id}
                        className="text-xs px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: label.color }}
                      >
                        {label.name}
                      </span>
                    ))}
                    {task.labels.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{task.labels.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {task.assignedTo && task.assignedTo.length > 0 && (
              <div className="flex -space-x-2 shrink-0">
                {task.assignedTo.slice(0, 3).map((user) => (
                  <UserAvatar
                    key={user._id}
                    name={user.firstName || user.username}
                    src={user.avatar}
                    size="sm"
                    className="border-2 border-background"
                  />
                ))}
                {task.assignedTo.length > 3 && (
                  <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                    +{task.assignedTo.length - 3}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
