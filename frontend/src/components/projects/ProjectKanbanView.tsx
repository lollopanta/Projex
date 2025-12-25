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
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);

  // Debug: Log permissions and columns
  React.useEffect(() => {
    if (projectColumns.length > 0) {
      console.log('Project columns loaded:', projectColumns.map(c => ({ id: c._id, name: c.name, type: typeof c._id })));
    } else {
      console.log('No project columns - using defaults');
    }
  }, [projectColumns]);

  // Initialize columns from project or use defaults (only when columns structure changes)
  useEffect(() => {
    if (columnsLoading) return;
    
    // Don't update columns if we're in the middle of updating a task (drag operation)
    if (isUpdatingTask) return;

    // Only reinitialize if columns structure changed (new columns added/removed), not on task updates
    const currentColumnIds = columns.map(c => c._id).sort().join(',');
    const newColumnIds = projectColumns.length > 0 
      ? projectColumns.map(c => c._id).sort().join(',')
      : 'todo,in-progress,done';

    if (currentColumnIds !== newColumnIds || columns.length === 0) {
      // Column structure changed or first load, reinitialize
      if (projectColumns.length > 0) {
        // Use project columns - assign tasks based on kanbanColumnId
        // Tasks with kanbanColumnId: null should be assigned to the first column (usually "To Do")
        const firstColumnId = projectColumns[0]._id;
        // Find the "Done" column by name (case-insensitive)
        const doneColumn = projectColumns.find((col) => col.name.toLowerCase() === 'done');
        const doneColumnId = doneColumn?._id;
        
        const columnsWithTasks: KanbanColumnWithTasks[] = projectColumns.map((col) => {
          // Tasks that explicitly belong to this column
          let assignedTasks = tasks
            .filter((t) => t.kanbanColumnId === col._id)
            .map((t) => t._id);
          
          // If this is the Done column, also include completed tasks with kanbanColumnId: null
          if (col._id === doneColumnId) {
            const completedUnassignedTasks = tasks
              .filter((t) => t.completed && !t.kanbanColumnId)
              .map((t) => t._id);
            assignedTasks = [...new Set([...assignedTasks, ...completedUnassignedTasks])];
          }
          // If this is the first column, also include incomplete tasks with kanbanColumnId: null
          else if (col._id === firstColumnId) {
            const unassignedTasks = tasks
              .filter((t) => !t.kanbanColumnId && !t.completed)
              .map((t) => t._id);
            assignedTasks = [...new Set([...assignedTasks, ...unassignedTasks])];
          }
          
          return {
            ...col,
            taskIds: assignedTasks,
          };
        });
        setColumns(columnsWithTasks);
      } else {
        // No project columns - use default columns
        const defaultColumns: KanbanColumnWithTasks[] = [
          { _id: "todo", name: "To Do", color: "#6366F1", position: 0, createdAt: new Date().toISOString(), taskIds: tasks.filter((t) => !t.completed && !t.kanbanColumnId).map((t) => t._id) },
          { _id: "in-progress", name: "In Progress", color: "#F59E0B", position: 1, createdAt: new Date().toISOString(), taskIds: [] },
          { _id: "done", name: "Done", color: "#22C55E", position: 2, createdAt: new Date().toISOString(), taskIds: tasks.filter((t) => t.completed && !t.kanbanColumnId).map((t) => t._id) },
        ];
        setColumns(defaultColumns);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectColumns, columnsLoading]); // Intentionally exclude 'tasks' and 'columns' to prevent reset on task updates

  // Update task assignments when tasks change (without resetting column structure)
  useEffect(() => {
    if (columnsLoading || columns.length === 0 || isUpdatingTask) return;

    // Update task assignments for existing columns
    if (projectColumns.length > 0) {
      // Use project columns - assign tasks based on kanbanColumnId
      // Tasks with kanbanColumnId: null should be assigned to the first column
      const firstColumnId = projectColumns[0]._id;
      setColumns(prevColumns => prevColumns.map(col => {
        // Tasks that explicitly belong to this column
        const assignedTasks = tasks
          .filter((t) => t.kanbanColumnId === col._id)
          .map((t) => t._id);
        
        // If this is the first column, also include tasks with kanbanColumnId: null
        if (col._id === firstColumnId) {
          const unassignedTasks = tasks
            .filter((t) => !t.kanbanColumnId)
            .map((t) => t._id);
          return {
            ...col,
            taskIds: [...new Set([...assignedTasks, ...unassignedTasks])], // Remove duplicates
          };
        }
        
        return {
          ...col,
          taskIds: assignedTasks,
        };
      }));
    } else {
      // Default columns - update based on completion status
      setColumns(prevColumns => prevColumns.map(col => {
        if (col._id === "todo") {
          return { ...col, taskIds: tasks.filter((t) => !t.completed && !t.kanbanColumnId).map((t) => t._id) };
        } else if (col._id === "done") {
          return { ...col, taskIds: tasks.filter((t) => t.completed && !t.kanbanColumnId).map((t) => t._id) };
        }
        return col;
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]); // Only update task assignments, not column structure

  const handleDragStart = (event: DragStartEvent) => {
    console.log('Drag started:', event.active.id, 'canDragTasks:', permissions.canDragTasks);
    // Always set activeId - we'll check permissions in handleDragEnd
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Visual feedback only - don't update state here, let handleDragEnd handle it
    // This prevents conflicts between dragOver and dragEnd handlers
  };

  const handleDragEnd = (event: DragEndEvent) => {
    console.log('Drag end called:', { active: event.active.id, over: event.over?.id, canDragTasks: permissions.canDragTasks });
    const { active, over } = event;
    setActiveId(null);

    if (!permissions.canDragTasks) {
      console.log('Cannot drag - permission denied');
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

    if (!over) {
      console.log('No over target');
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

    console.log('Processing drag:', { taskId, overId, columns: columns.map(c => ({ id: c._id, name: c.name, taskIds: c.taskIds })) });

    // Find source column
    const sourceColumn = columns.find((col) => col.taskIds.includes(taskId));
    if (!sourceColumn) {
      console.log('Source column not found for task:', taskId);
      return;
    }

    console.log('Source column:', sourceColumn._id);
    console.log('Project columns:', projectColumns);
    console.log('Current columns:', columns.map(c => ({ id: c._id, name: c.name })));

    // Check if dropped on a column (droppable area)
    const targetColumn = columns.find((col) => col._id === overId);
    if (targetColumn && targetColumn._id !== sourceColumn._id) {
      console.log('Dropped on column:', targetColumn._id, 'Type:', typeof targetColumn._id);
      
      // Check if this column exists in projectColumns (has real ObjectId)
      const projectColumn = projectColumns.find((col) => col._id === targetColumn._id);
      console.log('Found project column:', projectColumn);
      
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

      // Update task in backend
      // If projectColumns exist, always use project columns (they have ObjectIds)
      // Only use default column logic if no project columns exist
      let updateData: { kanbanColumnId: string | null; completed?: boolean };
      
      if (projectColumns.length > 0) {
        // Project columns exist - find the matching column by name or ID
        // Try to find by ID first (in case IDs match)
        let matchingProjectColumn = projectColumns.find((col) => col._id === targetColumn._id);
        
        // If not found by ID, try to find by name (for default columns that were converted to project columns)
        if (!matchingProjectColumn) {
          matchingProjectColumn = projectColumns.find((col) => {
            const targetName = targetColumn.name.toLowerCase();
            const colName = col.name.toLowerCase();
            return (targetName === 'in progress' && colName === 'in progress') ||
                   (targetName === 'to do' && colName === 'to do') ||
                   (targetName === 'done' && colName === 'done') ||
                   colName === targetName;
          });
        }
        
        if (matchingProjectColumn) {
          // Found matching project column - use its ObjectId
          console.log('Using project column ObjectId:', matchingProjectColumn._id, 'for column:', targetColumn.name);
          // If moving to Done column, mark as completed
          const isDoneColumn = matchingProjectColumn.name.toLowerCase() === 'done';
          // If moving from Done to another column, uncomplete
          const isMovingFromDone = sourceColumn.name.toLowerCase() === 'done';
          updateData = { 
            kanbanColumnId: matchingProjectColumn._id,
            ...(isDoneColumn ? { completed: true } : isMovingFromDone ? { completed: false } : {})
          };
        } else {
          // Column not found in projectColumns - use the targetColumn._id (might be ObjectId already)
          console.warn('Column not found in projectColumns, using targetColumn._id:', targetColumn._id);
          // Check if it's a valid ObjectId format
          const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(targetColumn._id);
          if (isValidObjectId) {
            updateData = { kanbanColumnId: targetColumn._id };
          } else {
            // Invalid ObjectId, treat as default column
            if (targetColumn._id === "done") {
              updateData = { completed: true, kanbanColumnId: null };
            } else if (targetColumn._id === "todo") {
              updateData = { completed: false, kanbanColumnId: null };
            } else {
              // For other columns, uncomplete if it was completed
              const task = tasks.find((t) => t._id === taskId);
              updateData = { 
                kanbanColumnId: null,
                ...(task?.completed ? { completed: false } : {})
              };
            }
          }
        }
      } else {
        // No project columns - using default columns
        const isMovingFromDone = sourceColumn._id === "done";
        if (targetColumn._id === "done") {
          updateData = { completed: true, kanbanColumnId: null };
        } else if (targetColumn._id === "todo") {
          updateData = { completed: false, kanbanColumnId: null };
        } else {
          // in-progress or other default columns - uncomplete if moving from Done
          updateData = { 
            kanbanColumnId: null,
            ...(isMovingFromDone ? { completed: false } : {})
          };
        }
      }

      console.log('Calling updateTask mutation:', { 
        taskId, 
        updateData, 
        targetColumnId: targetColumn._id,
        projectColumnsLength: projectColumns.length,
        isProjectColumn: projectColumns.length > 0 && projectColumns.some(c => c._id === targetColumn._id)
      });
      setIsUpdatingTask(true);
      updateTask.mutate(
        { id: taskId, data: updateData },
        {
          onSuccess: (updatedTask) => {
            console.log('Task updated successfully:', { 
              taskId: updatedTask._id, 
              kanbanColumnId: updatedTask.kanbanColumnId 
            });
            // Keep columns as-is, they're already updated optimistically
            setTimeout(() => setIsUpdatingTask(false), 500); // Allow time for backend to process
          },
          onError: (error) => {
            console.error('Task update failed:', error);
            setIsUpdatingTask(false);
            // Reset columns on error
            if (projectColumns.length > 0) {
              const columnsWithTasks: KanbanColumnWithTasks[] = projectColumns.map((col) => ({
                ...col,
                taskIds: tasks
                  .filter((t) => t.kanbanColumnId === col._id)
                  .map((t) => t._id),
              }));
              setColumns(columnsWithTasks);
            }
          },
        }
      );
      return;
    }

    // Check if dropped on another task (reordering within same column or moving)
    const overTaskId = overId;
    const overTaskColumn = columns.find((col) => col.taskIds.includes(overTaskId));
    
    if (overTaskColumn) {
      console.log('Dropped on task in column:', overTaskColumn._id);
      if (sourceColumn._id === overTaskColumn._id) {
        // Reordering within same column
        if (taskId === overTaskId) {
          return; // Dropped on same task, no-op
        }
        const oldIndex = sourceColumn.taskIds.indexOf(taskId);
        const newIndex = overTaskColumn.taskIds.indexOf(overTaskId);
        
        if (oldIndex !== newIndex) {
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
        }
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

        // Update task in backend
        // If projectColumns exist, always use project columns (they have ObjectIds)
        // Only use default column logic if no project columns exist
        let updateData: { kanbanColumnId: string | null; completed?: boolean };
        
        if (projectColumns.length > 0) {
          // Project columns exist - find the matching column by name or ID
          let matchingProjectColumn = projectColumns.find((col) => col._id === overTaskColumn._id);
          
          // If not found by ID, try to find by name
          if (!matchingProjectColumn) {
            matchingProjectColumn = projectColumns.find((col) => {
              const targetName = overTaskColumn.name.toLowerCase();
              const colName = col.name.toLowerCase();
              return (targetName === 'in progress' && colName === 'in progress') ||
                     (targetName === 'to do' && colName === 'to do') ||
                     (targetName === 'done' && colName === 'done') ||
                     colName === targetName;
            });
          }
          
          if (matchingProjectColumn) {
            // If moving to Done column, mark as completed
            const isDoneColumn = matchingProjectColumn.name.toLowerCase() === 'done';
            // If moving from Done to another column, uncomplete
            const isMovingFromDone = sourceColumn.name.toLowerCase() === 'done';
            updateData = { 
              kanbanColumnId: matchingProjectColumn._id,
              ...(isDoneColumn ? { completed: true } : isMovingFromDone ? { completed: false } : {})
            };
          } else {
            // Check if it's a valid ObjectId format
            const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(overTaskColumn._id);
            if (isValidObjectId) {
              // Check if moving from Done
              const isMovingFromDone = sourceColumn.name.toLowerCase() === 'done';
              updateData = { 
                kanbanColumnId: overTaskColumn._id,
                ...(isMovingFromDone ? { completed: false } : {})
              };
            } else {
              // Invalid ObjectId, treat as default column
              if (overTaskColumn._id === "done") {
                updateData = { completed: true, kanbanColumnId: null };
              } else if (overTaskColumn._id === "todo") {
                updateData = { completed: false, kanbanColumnId: null };
              } else {
                // For other columns, uncomplete if moving from Done
                const isMovingFromDone = sourceColumn.name.toLowerCase() === 'done';
                updateData = { 
                  kanbanColumnId: null,
                  ...(isMovingFromDone ? { completed: false } : {})
                };
              }
            }
          }
        } else {
          // No project columns - using default columns
          const isMovingFromDone = sourceColumn._id === "done";
          if (overTaskColumn._id === "done") {
            updateData = { completed: true, kanbanColumnId: null };
          } else if (overTaskColumn._id === "todo") {
            updateData = { completed: false, kanbanColumnId: null };
          } else {
            // in-progress or other default columns - uncomplete if moving from Done
            updateData = { 
              kanbanColumnId: null,
              ...(isMovingFromDone ? { completed: false } : {})
            };
          }
        }

        console.log('Calling updateTask mutation (dropped on task):', { taskId, updateData });
        setIsUpdatingTask(true);
        updateTask.mutate(
          { id: taskId, data: updateData },
          {
            onSuccess: () => {
              // Keep columns as-is, they're already updated optimistically
              setTimeout(() => setIsUpdatingTask(false), 500); // Allow time for backend to process
            },
            onError: () => {
              setIsUpdatingTask(false);
              // Reset columns on error
              if (projectColumns.length > 0) {
                const columnsWithTasks: KanbanColumnWithTasks[] = projectColumns.map((col) => ({
                  ...col,
                  taskIds: tasks
                    .filter((t) => t.kanbanColumnId === col._id)
                    .map((t) => t._id),
                }));
                setColumns(columnsWithTasks);
              }
            },
          }
        );
      }
    } else {
      console.log('Not dropped on column or task, overId:', overId);
    }
  };

  const getTaskById = (taskId: string) => tasks.find((t) => t._id === taskId);

  const TaskCard: React.FC<{ taskId: string }> = ({ taskId }) => {
    const task = getTaskById(taskId);
    if (!task) return null;

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: taskId,
      disabled: false, // Always allow dragging - we'll check permissions in handleDragEnd
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
          // Only open modal if not dragging and not starting a drag
          if (!isDragging && !attributes['aria-pressed']) {
            e.stopPropagation();
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
    const { setNodeRef: setColumnRef, isOver } = useDroppable({
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
            ref={setColumnRef}
            className={cn("flex-1 overflow-y-auto", isOver && "bg-muted/30")}
            data-droppable-id={column._id}
          >
            <SortableContext
              items={column.taskIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 min-h-[100px]" data-column-id={column._id}>
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
