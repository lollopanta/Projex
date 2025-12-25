/**
 * ============================================
 * PROJECT KANBAN VIEW
 * Kanban board with custom columns and drag & drop
 * ============================================
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent, closestCorners, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faGripVertical,
} from "@fortawesome/free-solid-svg-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useUpdateTask } from "@/hooks/useTasks";
import { useKanbanColumns } from "@/hooks/useProjects";
import { useUIStore } from "@/store";
import type { TaskPopulated, KanbanColumn as KanbanColumnType } from "@/types";

interface KanbanColumnWithTasks extends KanbanColumnType {
  taskIds: string[];
}

interface ProjectKanbanViewProps {
  projectId: string;
  tasks: TaskPopulated[];
}

export const ProjectKanbanView: React.FC<ProjectKanbanViewProps> = ({
  projectId,
  tasks,
}) => {
  const { openModal } = useUIStore();
  const permissions = useProjectPermissions(projectId);
  const updateTask = useUpdateTask();
  const { data: projectColumns = [], isLoading: columnsLoading } = useKanbanColumns(projectId);

  const [columns, setColumns] = useState<KanbanColumnWithTasks[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Initialize columns from project or use defaults
  useEffect(() => {
    if (columnsLoading) return;

    if (projectColumns.length > 0) {
      // Use project columns
      const columnsWithTasks: KanbanColumnWithTasks[] = projectColumns.map((col) => ({
        ...col,
        taskIds: tasks
          .filter((t) => t.kanbanColumnId === col._id)
          .map((t) => t._id),
      }));
      setColumns(columnsWithTasks);
    } else {
      // Use default columns (for backward compatibility)
      const defaultColumns: KanbanColumnWithTasks[] = [
        { _id: "todo", name: "To Do", color: "#6366F1", position: 0, createdAt: new Date().toISOString(), taskIds: tasks.filter((t) => !t.completed && !t.kanbanColumnId).map((t) => t._id) },
        { _id: "in-progress", name: "In Progress", color: "#F59E0B", position: 1, createdAt: new Date().toISOString(), taskIds: [] },
        { _id: "done", name: "Done", color: "#22C55E", position: 2, createdAt: new Date().toISOString(), taskIds: tasks.filter((t) => t.completed && !t.kanbanColumnId).map((t) => t._id) },
      ];
      setColumns(defaultColumns);
    }
  }, [projectColumns, tasks, columnsLoading]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dragging over a column
    const targetColumn = columns.find((col) => col._id === overId);
    if (targetColumn) {
      // Task is being dragged over a column
      const sourceColumn = columns.find((col) => col.taskIds.includes(taskId));
      if (sourceColumn && sourceColumn._id !== targetColumn._id) {
        // Moving between columns
        const updatedColumns = columns.map((col) => {
          if (col._id === sourceColumn._id) {
            return { ...col, taskIds: col.taskIds.filter((id) => id !== taskId) };
          }
          if (col._id === targetColumn._id && !col.taskIds.includes(taskId)) {
            return { ...col, taskIds: [...col.taskIds, taskId] };
          }
          return col;
        });
        setColumns(updatedColumns);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !permissions.canDragTasks) {
      // Reset columns if drag was cancelled
      if (projectColumns.length > 0) {
        const columnsWithTasks: KanbanColumnWithTasks[] = projectColumns.map((col) => ({
          ...col,
          taskIds: tasks
            .filter((t) => t.kanbanColumnId === col._id)
            .map((t) => t._id),
        }));
        setColumns(columnsWithTasks);
      } else {
        const defaultColumns: KanbanColumnWithTasks[] = [
          { _id: "todo", name: "To Do", color: "#6366F1", position: 0, createdAt: new Date().toISOString(), taskIds: tasks.filter((t) => !t.completed && !t.kanbanColumnId).map((t) => t._id) },
          { _id: "in-progress", name: "In Progress", color: "#F59E0B", position: 1, createdAt: new Date().toISOString(), taskIds: [] },
          { _id: "done", name: "Done", color: "#22C55E", position: 2, createdAt: new Date().toISOString(), taskIds: tasks.filter((t) => t.completed && !t.kanbanColumnId).map((t) => t._id) },
        ];
        setColumns(defaultColumns);
      }
      return;
    }

    const taskId = active.id as string;
    const overId = over.id as string;

    // Find source column
    const sourceColumn = columns.find((col) => col.taskIds.includes(taskId));
    if (!sourceColumn) return;

    // Check if dropped on a column (droppable area)
    const targetColumn = columns.find((col) => col._id === overId);
    if (targetColumn && targetColumn._id !== sourceColumn._id) {
      // Moving task to a different column
      const updatedColumns = columns.map((col) => {
        if (col._id === sourceColumn._id) {
          return { ...col, taskIds: col.taskIds.filter((id) => id !== taskId) };
        }
        if (col._id === targetColumn._id) {
          return { ...col, taskIds: [...col.taskIds, taskId] };
        }
        return col;
      });
      setColumns(updatedColumns);
      onColumnsChange?.(updatedColumns);

      // Update task in backend
      if (targetColumn._id === "done") {
        updateTask.mutate({ id: taskId, data: { completed: true } });
      } else if (targetColumn._id === "todo") {
        updateTask.mutate({ id: taskId, data: { completed: false } });
      }
      return;
    }

    // Check if dropped on another task (reordering within same column or moving)
    const overTaskId = overId;
    const overTaskColumn = columns.find((col) => col.taskIds.includes(overTaskId));
    
    if (overTaskColumn) {
      if (sourceColumn._id === overTaskColumn._id) {
        // Reordering within same column
        const oldIndex = sourceColumn.taskIds.indexOf(taskId);
        const newIndex = overTaskColumn.taskIds.indexOf(overTaskId);
        
        const updatedColumns = columns.map((col) => {
          if (col._id === sourceColumn._id) {
            return {
              ...col,
              taskIds: arrayMove(col.taskIds, oldIndex, newIndex),
            };
          }
          return col;
        });
        setColumns(updatedColumns);
      } else {
        // Moving to different column by dropping on a task
        const newIndex = overTaskColumn.taskIds.indexOf(overTaskId);
        const updatedColumns = columns.map((col) => {
          if (col._id === sourceColumn._id) {
            return { ...col, taskIds: col.taskIds.filter((id) => id !== taskId) };
          }
          if (col._id === overTaskColumn._id) {
            const newTaskIds = [...col.taskIds];
            newTaskIds.splice(newIndex, 0, taskId);
            return { ...col, taskIds: newTaskIds };
          }
          return col;
        });
        setColumns(updatedColumns);

        // Update task in backend with kanbanColumnId
        if (overTaskColumn._id === "done") {
          updateTask.mutate({ id: taskId, data: { kanbanColumnId: overTaskColumn._id, completed: true } });
        } else if (overTaskColumn._id === "todo") {
          updateTask.mutate({ id: taskId, data: { kanbanColumnId: overTaskColumn._id, completed: false } });
        } else {
          updateTask.mutate({ id: taskId, data: { kanbanColumnId: overTaskColumn._id } });
        }
      }
    }
  };

  const getTaskById = (taskId: string) => tasks.find((t) => t._id === taskId);

  const TaskCard: React.FC<{ taskId: string }> = ({ taskId }) => {
    const task = getTaskById(taskId);
    if (!task) return null;

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: taskId,
      disabled: !permissions.canDragTasks,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <motion.div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cn(
          "p-3 rounded-lg border bg-card cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow",
          !permissions.canDragTasks && "cursor-not-allowed opacity-60",
          isDragging && "opacity-50"
        )}
        onClick={(e) => {
          // Only open modal if not dragging
          if (!isDragging) {
            openModal("taskDetail", task);
          }
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="font-medium text-sm flex-1">{task.title}</p>
          {permissions.canDragTasks && (
            <FontAwesomeIcon
              icon={faGripVertical}
              className="w-3 h-3 text-muted-foreground shrink-0"
            />
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
      </motion.div>
    );
  };

  const Column: React.FC<{ column: KanbanColumnWithTasks }> = ({ column }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: column._id,
    });

    const columnTasks = column.taskIds
      .map((id) => getTaskById(id))
      .filter((t): t is TaskPopulated => t !== undefined);

    return (
      <div className="flex flex-col h-full min-w-[280px]">
        <Card className={cn("flex-1 flex flex-col", isOver && "ring-2 ring-primary ring-offset-2")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: column.color }}
                />
                <CardTitle className="text-sm font-semibold">{column.name}</CardTitle>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {columnTasks.length}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent 
            ref={setNodeRef}
            className={cn("flex-1 overflow-y-auto", isOver && "bg-muted/30")}
          >
            <SortableContext
              items={column.taskIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 min-h-[100px]">
                <AnimatePresence mode="popLayout">
                  {columnTasks.map((task) => (
                    <TaskCard key={task._id} taskId={task._id} />
                  ))}
                </AnimatePresence>
                {columnTasks.length === 0 && (
                  <div className="flex items-center justify-center h-32 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                    Drop tasks here
                  </div>
                )}
              </div>
            </SortableContext>

            {permissions.canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => openModal("task", { projectId, columnId: column._id })}
              >
                <FontAwesomeIcon icon={faPlus} className="w-3 h-3 mr-1" />
                Add Task
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "600px" }}>
        {columns.map((column) => (
          <Column key={column._id} column={column} />
        ))}
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="p-3 rounded-lg border bg-card shadow-lg w-64">
            {(() => {
              const task = getTaskById(activeId);
              return task ? (
                <>
                  <p className="font-medium text-sm mb-2">{task.title}</p>
                  <PriorityBadge priority={task.priority} />
                </>
              ) : null;
            })()}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
