/**
 * ============================================
 * PROJECT GANTT VIEW
 * Gantt chart with timeline and task bars
 * ============================================
 */

import React, { useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faCalendarDay,
  faCalendarWeek,
  faCalendar,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useUIStore } from "@/store";
import type { TaskPopulated } from "@/types";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

type ZoomLevel = "day" | "week" | "month";

interface ProjectGanttViewProps {
  projectId: string;
  tasks: TaskPopulated[];
}

export const ProjectGanttView: React.FC<ProjectGanttViewProps> = ({
  projectId,
  tasks,
}) => {
  const { openModal } = useUIStore();
  const permissions = useProjectPermissions(projectId);

  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("week");
  const [startDate, setStartDate] = useState(dayjs().startOf("week"));

  // Calculate timeline range based on zoom level
  const timelineRange = useMemo(() => {
    const days = zoomLevel === "day" ? 14 : zoomLevel === "week" ? 12 : 6;
    const dates: dayjs.Dayjs[] = [];
    
    for (let i = 0; i < days; i++) {
      if (zoomLevel === "day") {
        dates.push(startDate.add(i, "day"));
      } else if (zoomLevel === "week") {
        dates.push(startDate.add(i, "week"));
      } else {
        dates.push(startDate.add(i, "month"));
      }
    }
    
    return dates;
  }, [startDate, zoomLevel]);

  // Calculate task positions and widths
  const taskBars = useMemo(() => {
    return tasks
      .filter((task) => task.dueDate)
      .map((task) => {
        // Use created date as start if no explicit start date
        const taskStart = dayjs(task.createdAt);
        const taskEnd = task.dueDate ? dayjs(task.dueDate) : taskStart.add(1, "day");

        // Calculate position and width in pixels
        const timelineStart = timelineRange[0];
        const timelineEnd = timelineRange[timelineRange.length - 1];
        const totalDays = timelineEnd.diff(timelineStart, zoomLevel === "day" ? "day" : zoomLevel === "week" ? "week" : "month");
        const taskStartOffset = taskStart.diff(timelineStart, zoomLevel === "day" ? "day" : zoomLevel === "week" ? "week" : "month");
        const taskDuration = taskEnd.diff(taskStart, zoomLevel === "day" ? "day" : zoomLevel === "week" ? "week" : "month");

        const containerWidth = 1200; // Approximate container width
        const unitWidth = containerWidth / totalDays;
        const left = Math.max(0, taskStartOffset * unitWidth);
        const width = Math.max(20, taskDuration * unitWidth);

        return {
          task,
          left,
          width,
          start: taskStart,
          end: taskEnd,
        };
      });
  }, [tasks, timelineRange, zoomLevel]);

  const handleNavigate = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setStartDate(startDate.subtract(zoomLevel === "day" ? 7 : zoomLevel === "week" ? 4 : 1, zoomLevel === "day" ? "day" : zoomLevel === "week" ? "week" : "month"));
    } else {
      setStartDate(startDate.add(zoomLevel === "day" ? 7 : zoomLevel === "week" ? 4 : 1, zoomLevel === "day" ? "day" : zoomLevel === "week" ? "week" : "month"));
    }
  };

  const getBarColor = (task: TaskPopulated) => {
    if (task.completed) return "#22C55E";
    const priorityColors = { low: "#3B82F6", medium: "#F59E0B", high: "#EF4444" };
    return priorityColors[task.priority] || "#6366F1";
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigate("prev")}
          >
            <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStartDate(dayjs().startOf("week"))}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigate("next")}
          >
            <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={zoomLevel === "day" ? "default" : "ghost"}
            size="sm"
            onClick={() => setZoomLevel("day")}
          >
            <FontAwesomeIcon icon={faCalendarDay} className="w-4 h-4" />
          </Button>
          <Button
            variant={zoomLevel === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => setZoomLevel("week")}
          >
            <FontAwesomeIcon icon={faCalendarWeek} className="w-4 h-4" />
          </Button>
          <Button
            variant={zoomLevel === "month" ? "default" : "ghost"}
            size="sm"
            onClick={() => setZoomLevel("month")}
          >
            <FontAwesomeIcon icon={faCalendar} className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="border rounded-lg overflow-x-auto">
        <div className="min-w-full" style={{ minWidth: "1200px" }}>
          {/* Timeline Header */}
          <div className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm border-b">
            <div className="flex">
              <div className="w-64 p-3 border-r font-semibold">Task</div>
              <div className="flex-1 flex">
                {timelineRange.map((date, index) => (
                  <div
                    key={index}
                    className="flex-1 p-2 text-center text-sm border-r last:border-r-0"
                    style={{ minWidth: "100px" }}
                  >
                    {zoomLevel === "day"
                      ? date.format("MMM D")
                      : zoomLevel === "week"
                      ? `W${date.week()} ${date.format("MMM")}`
                      : date.format("MMM YYYY")}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Task Rows */}
          <div className="divide-y">
            {taskBars.map(({ task, left, width, start, end }) => (
              <div
                key={task._id}
                className="flex items-center hover:bg-muted/30 transition-colors"
                style={{ minHeight: "60px" }}
              >
                {/* Task Info */}
                <div className="w-64 p-3 border-r flex items-center gap-2 shrink-0">
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "font-medium text-sm truncate",
                        task.completed && "line-through text-muted-foreground"
                      )}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <PriorityBadge priority={task.priority} />
                      {task.assignedTo && task.assignedTo.length > 0 && (
                        <div className="flex -space-x-1">
                          {task.assignedTo.slice(0, 2).map((user) => (
                            <UserAvatar
                              key={user._id}
                              name={user.firstName || user.username}
                              src={user.avatar}
                              size="sm"
                              className="border-2 border-background"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Timeline Bar Area */}
                <div className="flex-1 relative" style={{ minHeight: "60px" }}>
                  <div
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 h-8 rounded px-2 flex items-center text-white text-xs font-medium cursor-pointer",
                      !permissions.canDragTasks && "cursor-not-allowed opacity-60"
                    )}
                    style={{
                      left: `${left}px`,
                      width: `${width}px`,
                      backgroundColor: getBarColor(task),
                      minWidth: "40px",
                    }}
                    onClick={() => openModal("taskDetail", task)}
                    title={`${start.format("MMM D")} - ${end.format("MMM D")}`}
                  >
                    <span className="truncate">{task.title}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {taskBars.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No tasks with dates to display</p>
              <p className="text-sm mt-1">Add due dates to tasks to see them in the Gantt chart</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
