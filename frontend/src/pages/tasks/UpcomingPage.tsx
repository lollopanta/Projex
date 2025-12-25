/**
 * ============================================
 * UPCOMING PAGE
 * Tasks due in the next 7 days
 * ============================================
 */

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarWeek, faPlus, faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonTaskCard } from "@/components/ui/skeleton";
import { useTasks } from "@/hooks/useTasks";
import { useUIStore } from "@/store";
import { TaskList } from "@/components/tasks/TaskList";
import dayjs from "dayjs";
import type { TaskPopulated } from "@/types";

export const UpcomingPage: React.FC = () => {
  const { openModal } = useUIStore();
  const [daysAhead, setDaysAhead] = useState(7);

  // Fetch upcoming tasks
  const { data, isLoading } = useTasks({
    limit: 200,
  });

  // Filter tasks due in the next N days
  const upcomingTasks = (data?.tasks || []).filter((task) => {
    if (!task.dueDate || task.completed) return false;
    const dueDate = dayjs(task.dueDate);
    const today = dayjs().startOf("day");
    const end = dayjs().add(daysAhead, "days").endOf("day");
    return dueDate.isAfter(today) && dueDate.isBefore(end);
  });

  // Group by date
  const tasksByDate = upcomingTasks.reduce((acc, task) => {
    if (!task.dueDate) return acc;
    const dateKey = dayjs(task.dueDate).format("YYYY-MM-DD");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(task);
    return acc;
  }, {} as Record<string, TaskPopulated[]>);

  // Sort dates
  const sortedDates = Object.keys(tasksByDate).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FontAwesomeIcon icon={faCalendarWeek} className="w-8 h-8 text-primary" />
            Upcoming
          </h1>
          <p className="text-muted-foreground mt-1">
            Tasks due in the next {daysAhead} days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDaysAhead(Math.max(3, daysAhead - 7))}
            disabled={daysAhead <= 7}
          >
            <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDaysAhead(daysAhead + 7)}
          >
            <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4" />
          </Button>
          <Button onClick={() => openModal("task")}>
            <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      {/* Tasks by Date */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <SkeletonTaskCard />
              <SkeletonTaskCard />
              <SkeletonTaskCard />
            </div>
          </CardContent>
        </Card>
      ) : sortedDates.length > 0 ? (
        <div className="space-y-6">
          {sortedDates.map((dateKey) => {
            const tasks = tasksByDate[dateKey];
            const date = dayjs(dateKey);
            const isToday = date.isSame(dayjs(), "day");
            const isTomorrow = date.isSame(dayjs().add(1, "day"), "day");

            return (
              <Card key={dateKey}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faCalendarWeek} className="w-5 h-5" />
                    {isToday
                      ? "Today"
                      : isTomorrow
                      ? "Tomorrow"
                      : date.format("dddd, MMMM D")}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({tasks.length} {tasks.length === 1 ? "task" : "tasks"})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TaskList tasks={tasks} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={faCalendarWeek}
              title="No upcoming tasks"
              description={`You don't have any tasks due in the next ${daysAhead} days.`}
              action={{
                label: "Create Task",
                onClick: () => openModal("task"),
              }}
              className="py-12"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UpcomingPage;
