/**
 * ============================================
 * SMART TASK LIST
 * Task list with Smart Engine integration, filters, and sorting
 * ============================================
 */

import React, { useState, useMemo, useEffect } from "react";
import { SmartTaskCard } from "./SmartTaskCard";
import { TaskFilters, type PriorityFilter, type SortOption } from "./TaskFilters";
import { useTasks, useUpdateTask } from "@/hooks/useTasks";
import { useTaskPriorities } from "@/hooks/useSmartEngine";
import { useToast } from "@/store";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { TaskPopulated } from "@/types";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

interface SmartTaskListProps {
  projectId?: string;
  listId?: string;
  className?: string;
}

/**
 * Filter tasks based on criteria
 */
const filterTasks = (
  tasks: TaskPopulated[],
  priorities: Map<string, any>,
  searchQuery: string,
  priorityFilter: PriorityFilter,
  blockingFilter: boolean,
  dueSoonFilter: boolean
): TaskPopulated[] => {
  return tasks.filter((task) => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = task.title.toLowerCase().includes(query);
      const matchesDescription = task.description?.toLowerCase().includes(query) || false;
      if (!matchesTitle && !matchesDescription) {
        return false;
      }
    }

    // Priority filter
    if (priorityFilter !== "all") {
      const priority = priorities.get(task._id);
      if (!priority) return false;

      const score = priority.priorityScore;
      if (priorityFilter === "high" && score < 67) return false;
      if (priorityFilter === "medium" && (score < 34 || score >= 67)) return false;
      if (priorityFilter === "low" && score >= 34) return false;
    }

    // Blocking filter (tasks with dependencies)
    if (blockingFilter) {
      if (!task.dependencies || task.dependencies.length === 0) {
        return false;
      }
    }

    // Due soon filter (next 7 days)
    if (dueSoonFilter) {
      if (!task.dueDate) return false;
      // Use UTC for accurate calculation (same as backend)
      const dueDateUTC = dayjs.utc(task.dueDate);
      const currentDateUTC = dayjs.utc();
      const daysUntilDue = dueDateUTC.diff(currentDateUTC, "day", true); // true = floating point
      if (daysUntilDue < 0 || daysUntilDue > 7) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Sort tasks based on option
 */
const sortTasks = (
  tasks: TaskPopulated[],
  priorities: Map<string, any>,
  sortBy: SortOption
): TaskPopulated[] => {
  const sorted = [...tasks];

  switch (sortBy) {
    case "priority":
      sorted.sort((a, b) => {
        const priorityA = priorities.get(a._id)?.priorityScore || 0;
        const priorityB = priorities.get(b._id)?.priorityScore || 0;
        return priorityB - priorityA; // Highest first
      });
      break;

    case "dueDate":
      sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return dayjs(a.dueDate).diff(dayjs(b.dueDate));
      });
      break;

    case "createdAt":
      sorted.sort((a, b) => {
        return dayjs(b.createdAt).diff(dayjs(a.createdAt)); // Newest first
      });
      break;

    case "title":
      sorted.sort((a, b) => {
        return a.title.localeCompare(b.title);
      });
      break;
  }

  return sorted;
};

export const SmartTaskList: React.FC<SmartTaskListProps> = ({
  projectId,
  listId,
  className,
}) => {
  const { toast } = useToast();
  const updateTask = useUpdateTask();

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [blockingFilter, setBlockingFilter] = useState(false);
  const [dueSoonFilter, setDueSoonFilter] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("priority");
  const [handledTaskIds, setHandledTaskIds] = useState<Set<string>>(new Set());

  // Fetch tasks
  const { data: tasksData, isLoading: tasksLoading } = useTasks({
    projectId,
    listId,
    completed: false, // Only show incomplete tasks by default
  });

  const tasks = tasksData?.tasks || [];

  // Fetch priorities for all tasks
  const taskIds = tasks.map((t) => t._id);
  const { data: priorities, isLoading: prioritiesLoading } = useTaskPriorities(
    taskIds,
    projectId
  );

  // Create priority map for quick lookup
  const priorityMap = useMemo(() => {
    const map = new Map<string, any>();
    if (priorities) {
      priorities.forEach((p) => {
        map.set(p.taskId, p);
      });
    }
    return map;
  }, [priorities]);

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = filterTasks(
      tasks,
      priorityMap,
      searchQuery,
      priorityFilter,
      blockingFilter,
      dueSoonFilter
    );

    // Remove handled tasks
    filtered = filtered.filter((task) => !handledTaskIds.has(task._id));

    return sortTasks(filtered, priorityMap, sortBy);
  }, [
    tasks,
    priorityMap,
    searchQuery,
    priorityFilter,
    blockingFilter,
    dueSoonFilter,
    sortBy,
    handledTaskIds,
  ]);

  // Handle task completion toggle
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

  // Track priority changes for notifications
  useEffect(() => {
    if (!priorities || priorities.length === 0) return;

    priorities.forEach((priority) => {
      const previousPriority = localStorage.getItem(`priority_${priority.taskId}`);
      if (previousPriority) {
        const prevScore = parseInt(previousPriority, 10);
        const currentScore = priority.priorityScore;

        // Notify if priority jumped significantly
        if (prevScore < 50 && currentScore >= 70) {
          toast.success(
            "Priority increased",
            `"${tasks.find((t) => t._id === priority.taskId)?.title}" is now high priority`
          );
        }
      }

      // Store current priority
      localStorage.setItem(`priority_${priority.taskId}`, priority.priorityScore.toString());
    });
  }, [priorities, tasks]);

  if (tasksLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filters */}
      <TaskFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        blockingFilter={blockingFilter}
        onBlockingFilterChange={setBlockingFilter}
        dueSoonFilter={dueSoonFilter}
        onDueSoonFilterChange={setDueSoonFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Task List */}
      {filteredAndSortedTasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium mb-2">No tasks found</p>
          <p className="text-sm">
            {searchQuery || priorityFilter !== "all" || blockingFilter || dueSoonFilter
              ? "Try adjusting your filters"
              : "Create a task to get started"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedTasks.map((task) => (
            <SmartTaskCard
              key={task._id}
              task={task}
              priority={priorityMap.get(task._id) || null}
              priorityLoading={prioritiesLoading}
              projectId={projectId}
              onToggleComplete={handleToggleComplete}
              onMarkHandled={handleMarkHandled}
              isHandled={handledTaskIds.has(task._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
