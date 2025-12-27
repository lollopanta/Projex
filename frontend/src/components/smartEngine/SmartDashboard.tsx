/**
 * ============================================
 * SMART DASHBOARD
 * Overview dashboard with urgent tasks and workload summary
 * ============================================
 */

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SmartTaskCard } from "./SmartTaskCard";
import { WorkloadIndicator } from "./WorkloadIndicator";
import { useTasks, useUpdateTask } from "@/hooks/useTasks";
import { useTaskPriorities, useUserWorkloads } from "@/hooks/useSmartEngine";
import { useToast, useAuthStore } from "@/store";
import { Skeleton } from "@/components/ui/skeleton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle, faUsers, faClock } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import type { TaskPopulated } from "@/types";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

interface SmartDashboardProps {
  projectId?: string;
  userIds?: string[];
  className?: string;
}

export const SmartDashboard: React.FC<SmartDashboardProps> = ({
  projectId,
  userIds,
  className,
}) => {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const updateTask = useUpdateTask();
  const [handledTaskIds, setHandledTaskIds] = useState<Set<string>>(new Set());

  // Fetch all tasks FIRST
  const { data: tasksData, isLoading: tasksLoading } = useTasks({
    projectId,
    completed: false,
  });

  const tasks = tasksData?.tasks || [];

  // Get user IDs from tasks if not provided
  const allUserIds = useMemo(() => {
    if (userIds && userIds.length > 0) {
      return userIds;
    }
    // Extract unique user IDs from tasks
    const ids = new Set<string>();
    tasks.forEach((task) => {
      if (task.assignedTo) {
        task.assignedTo.forEach((assignee) => {
          const id = typeof assignee === "object" ? assignee._id : assignee;
          if (id) ids.add(id);
        });
      }
    });
    return Array.from(ids);
  }, [userIds, tasks]);

  // Fetch priorities
  const taskIds = tasks.map((t) => t._id);
  const { data: priorities, isLoading: prioritiesLoading } = useTaskPriorities(
    taskIds,
    projectId
  );

  // Fetch workloads
  const { data: workloads, isLoading: workloadsLoading } = useUserWorkloads(
    allUserIds.length > 0 ? allUserIds : undefined,
    projectId
  );

  // Get urgent tasks (priority > 70)
  const urgentTasks = React.useMemo(() => {
    if (!priorities || !tasks) return [];

    const urgentTaskIds = priorities
      .filter((p) => p.priorityScore > 70)
      .map((p) => p.taskId);

    return tasks
      .filter((task) => urgentTaskIds.includes(task._id))
      .filter((task) => !handledTaskIds.has(task._id))
      .slice(0, 5); // Top 5 urgent tasks
  }, [priorities, tasks, handledTaskIds]);

  // Get blocking tasks (tasks with dependencies)
  const blockingTasks = React.useMemo(() => {
    return tasks
      .filter((task) => task.dependencies && task.dependencies.length > 0)
      .filter((task) => !task.completed)
      .slice(0, 5); // Top 5 blocking tasks
  }, [tasks]);

  // Get tasks due soon (next 7 days)
  const dueSoonTasks = React.useMemo(() => {
    return tasks
      .filter((task) => {
        if (!task.dueDate) return false;
        // Use UTC for accurate calculation (same as backend)
        const dueDateUTC = dayjs.utc(task.dueDate);
        const currentDateUTC = dayjs.utc();
        const daysUntilDue = dueDateUTC.diff(currentDateUTC, "day", true); // true = floating point
        return daysUntilDue >= 0 && daysUntilDue <= 7;
      })
      .sort((a, b) => {
        if (!a.dueDate || !b.dueDate) return 0;
        // Use UTC for sorting as well
        return dayjs.utc(a.dueDate).diff(dayjs.utc(b.dueDate));
      })
      .slice(0, 5); // Top 5 due soon
  }, [tasks]);

  // Create priority map
  const priorityMap = React.useMemo(() => {
    const map = new Map<string, any>();
    if (priorities) {
      priorities.forEach((p) => {
        map.set(p.taskId, p);
      });
    }
    return map;
  }, [priorities]);

  // Handle task completion
  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    try {
      await updateTask.mutateAsync({
        id: taskId,
        data: { completed },
      });
    } catch (error) {
      toast.error("Failed to update task", (error as Error).message);
    }
  };

  // Handle mark as handled
  const handleMarkHandled = (taskId: string) => {
    setHandledTaskIds((prev) => new Set([...prev, taskId]));
    toast.success("Task hidden", "Task has been hidden from urgent list");
  };

  // Auto-refresh every minute
  useEffect(() => {
    const interval = setInterval(() => {
      // TanStack Query will automatically refetch if stale
      window.dispatchEvent(new Event("focus")); // Trigger refetch
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Workload Summary */}
      {workloads && workloads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faUsers} className="w-5 h-5" />
              Team Workload
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workloadsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {workloads.map((workload) => (
                  <WorkloadIndicator
                    key={workload.userId}
                    userId={workload.userId}
                    showDetails
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Urgent Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-5 h-5 text-red-500" />
            Urgent Tasks (Priority &gt; 70)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {prioritiesLoading || tasksLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : urgentTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No urgent tasks at the moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {urgentTasks.map((task) => (
                <SmartTaskCard
                  key={task._id}
                  task={task}
                  priority={priorityMap.get(task._id) || null}
                  projectId={projectId}
                  onToggleComplete={handleToggleComplete}
                  onMarkHandled={handleMarkHandled}
                  isHandled={handledTaskIds.has(task._id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocking Tasks */}
      {blockingTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faClock} className="w-5 h-5 text-orange-500" />
              Tasks Blocking Others
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {blockingTasks.map((task) => (
                <SmartTaskCard
                  key={task._id}
                  task={task}
                  priority={priorityMap.get(task._id) || null}
                  projectId={projectId}
                  onToggleComplete={handleToggleComplete}
                  onMarkHandled={handleMarkHandled}
                  isHandled={handledTaskIds.has(task._id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Due Soon Tasks */}
      {dueSoonTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faClock} className="w-5 h-5 text-blue-500" />
              Due Soon (Next 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dueSoonTasks.map((task) => (
                <SmartTaskCard
                  key={task._id}
                  task={task}
                  priority={priorityMap.get(task._id) || null}
                  projectId={projectId}
                  onToggleComplete={handleToggleComplete}
                  onMarkHandled={handleMarkHandled}
                  isHandled={handledTaskIds.has(task._id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
