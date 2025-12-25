/**
 * ============================================
 * PROJECT TABLE VIEW
 * Advanced table view with resizable columns
 * ============================================
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faSort,
  faSortUp,
  faSortDown,
} from "@fortawesome/free-solid-svg-icons";
import { Checkbox } from "@/components/ui/checkbox";
import { PriorityBadge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { LabelBadge } from "@/components/ui/badge";
import { cn, isOverdue } from "@/lib/utils";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useUIStore } from "@/store";
import { useToggleTaskComplete } from "@/hooks/useTasks";
import type { TaskPopulated } from "@/types";
import dayjs from "dayjs";

type SortField = "position" | "title" | "priority" | "dueDate" | "completed" | "completedAt";
type SortDirection = "asc" | "desc";

interface Column {
  id: string;
  label: string;
  width: number;
  minWidth: number;
  resizable: boolean;
  sortable: boolean;
}

interface ProjectTableViewProps {
  projectId: string;
  tasks: TaskPopulated[];
}

export const ProjectTableView: React.FC<ProjectTableViewProps> = ({
  projectId,
  tasks,
}) => {
  const { openModal } = useUIStore();
  const permissions = useProjectPermissions(projectId);
  const toggleComplete = useToggleTaskComplete();

  const [columns, setColumns] = useState<Column[]>([
    { id: "number", label: "#", width: 60, minWidth: 50, resizable: false, sortable: false },
    { id: "completed", label: "Done", width: 80, minWidth: 60, resizable: false, sortable: true },
    { id: "title", label: "Title", width: 300, minWidth: 150, resizable: true, sortable: true },
    { id: "priority", label: "Priority", width: 100, minWidth: 80, resizable: false, sortable: true },
    { id: "labels", label: "Labels", width: 150, minWidth: 100, resizable: true, sortable: false },
    { id: "assignees", label: "Assignees", width: 150, minWidth: 100, resizable: true, sortable: false },
    { id: "dueDate", label: "Due Date", width: 150, minWidth: 120, resizable: true, sortable: true },
  ]);

  const [sortField, setSortField] = useState<SortField>("position");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  // Sort tasks
  const sortedTasks = React.useMemo(() => {
    const sorted = [...tasks];
    sorted.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case "completed": {
          aVal = a.completed ? 1 : 0;
          bVal = b.completed ? 1 : 0;
          break;
        }
        case "title": {
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        }
        case "priority": {
          const priorityOrder = { low: 1, medium: 2, high: 3 };
          aVal = priorityOrder[a.priority];
          bVal = priorityOrder[b.priority];
          break;
        }
        case "dueDate": {
          aVal = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          bVal = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          break;
        }
        case "completedAt": {
          aVal = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          bVal = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          break;
        }
        default:
          aVal = a.position;
          bVal = b.position;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [tasks, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleResizeStart = (columnId: string, e: React.MouseEvent) => {
    const column = columns.find((c) => c.id === columnId);
    if (!column || !column.resizable) return;

    setResizingColumn(columnId);
    setResizeStartX(e.clientX);
    setResizeStartWidth(column.width);
    e.preventDefault();
  };

  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const column = columns.find((c) => c.id === resizingColumn);
      if (!column) return;

      const diff = e.clientX - resizeStartX;
      const newWidth = Math.max(column.minWidth, resizeStartWidth + diff);

      setColumns((prev) =>
        prev.map((c) => (c.id === resizingColumn ? { ...c, width: newWidth } : c))
      );
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingColumn, resizeStartX, resizeStartWidth, columns]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <FontAwesomeIcon icon={faSort} className="w-3 h-3 opacity-30" />;
    }
    return sortDirection === "asc" ? (
      <FontAwesomeIcon icon={faSortUp} className="w-3 h-3" />
    ) : (
      <FontAwesomeIcon icon={faSortDown} className="w-3 h-3" />
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm border-b">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className="text-left p-3 text-sm font-semibold text-muted-foreground bg-muted/50"
                  style={{ width: column.width, minWidth: column.minWidth }}
                >
                  <div className="flex items-center gap-2">
                    {column.sortable ? (
                      <button
                        onClick={() => handleSort(column.id as SortField)}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        {column.label}
                        {getSortIcon(column.id as SortField)}
                      </button>
                    ) : (
                      <span>{column.label}</span>
                    )}
                    {column.resizable && (
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors"
                        onMouseDown={(e) => handleResizeStart(column.id, e)}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task, index) => {
              const overdue = task.dueDate && isOverdue(task.dueDate) && !task.completed;

              return (
                <motion.tr
                  key={task._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    "border-b hover:bg-muted/30 transition-colors cursor-pointer",
                    task.completed && "opacity-60"
                  )}
                  onClick={() => openModal("taskDetail", task)}
                >
                  {/* Task Number */}
                  <td className="p-3 text-sm text-muted-foreground">#{index + 1}</td>

                  {/* Completed */}
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={(checked) => {
                          if (permissions.canEdit && checked !== task.completed) {
                            toggleComplete.mutate(task._id);
                          }
                        }}
                        disabled={!permissions.canEdit}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {task.completed && task.completedAt && (
                        <span className="text-xs text-muted-foreground">
                          {dayjs(task.completedAt).format("MMM D, HH:mm")}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Title */}
                  <td className="p-3">
                    <p
                      className={cn(
                        "font-medium",
                        task.completed && "line-through text-muted-foreground"
                      )}
                    >
                      {task.title}
                    </p>
                  </td>

                  {/* Priority */}
                  <td className="p-3">
                    <PriorityBadge priority={task.priority} />
                  </td>

                  {/* Labels */}
                  <td className="p-3">
                    <div className="flex gap-1 flex-wrap">
                      {task.labels && task.labels.length > 0 ? (
                        task.labels.map((label) => (
                          <LabelBadge key={label._id} name={label.name} color={label.color} />
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>

                  {/* Assignees */}
                  <td className="p-3">
                    {task.assignedTo && task.assignedTo.length > 0 ? (
                      <div className="flex -space-x-2">
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
                          <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                            +{task.assignedTo.length - 3}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Due Date */}
                  <td className="p-3">
                    {task.dueDate ? (
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon
                          icon={faClock}
                          className={cn(
                            "w-3 h-3",
                            overdue ? "text-destructive" : "text-muted-foreground"
                          )}
                        />
                        <span
                          className={cn(
                            "text-sm",
                            overdue && !task.completed && "text-destructive font-medium"
                          )}
                        >
                          {dayjs(task.dueDate).format("MMM D, YYYY")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sortedTasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No tasks to display</p>
        </div>
      )}
    </div>
  );
};
