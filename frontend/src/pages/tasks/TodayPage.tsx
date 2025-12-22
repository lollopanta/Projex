/**
 * ============================================
 * TODAY PAGE
 * Tasks due today
 * ============================================
 */

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDay, faPlus, faClock } from "@fortawesome/free-solid-svg-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonTaskCard } from "@/components/ui/skeleton";
import { useTasks } from "@/hooks/useTasks";
import { useUIStore } from "@/store";
import { TaskList } from "@/components/tasks/TaskList";
import dayjs from "dayjs";
import { cn, isOverdue } from "@/lib/utils";

export const TodayPage: React.FC = () => {
  const { openModal } = useUIStore();

  const today = dayjs().format("YYYY-MM-DD");

  // Fetch tasks due today
  const { data, isLoading } = useTasks({
    dueDate: today,
    limit: 100,
  });

  const tasks = data?.tasks || [];

  // Separate completed and pending
  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  // Sort pending by overdue first, then priority
  const sortedPending = [...pendingTasks].sort((a, b) => {
    const aOverdue = a.dueDate && isOverdue(a.dueDate);
    const bOverdue = b.dueDate && isOverdue(b.dueDate);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FontAwesomeIcon icon={faCalendarDay} className="w-8 h-8 text-primary" />
            Today
          </h1>
          <p className="text-muted-foreground mt-1">
            Tasks due on {dayjs().format("MMMM D, YYYY")}
          </p>
        </div>
        <Button onClick={() => openModal("task")}>
          <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{tasks.length}</p>
              </div>
              <FontAwesomeIcon icon={faCalendarDay} className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingTasks.length}</p>
              </div>
              <FontAwesomeIcon icon={faClock} className="w-8 h-8 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedTasks.length}</p>
              </div>
              <FontAwesomeIcon icon={faCalendarDay} className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskList tasks={sortedPending} />
          </CardContent>
        </Card>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskList tasks={completedTasks} />
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && tasks.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={faCalendarDay}
              title="No tasks due today"
              description="You're all caught up! Add a new task to get started."
              action={{
                label: "Create Task",
                onClick: () => openModal("task"),
              }}
              className="py-12"
            />
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <SkeletonTaskCard />
              <SkeletonTaskCard />
              <SkeletonTaskCard />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TodayPage;
