/**
 * ============================================
 * PROJECT LIST VIEW
 * Vertical list of all project tasks with inline creation
 * ============================================
 */

import React, { useState, useRef, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faClock,
  faPlus,
  faEdit,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { LabelBadge } from "@/components/ui/badge";
import { cn, isOverdue } from "@/lib/utils";
import { useCreateTask, useUpdateTask, useToggleTaskComplete, useDeleteTask } from "@/hooks/useTasks";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useUIStore, useToast } from "@/store";
import type { TaskPopulated, ObjectId } from "@/types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

interface ProjectListViewProps {
  projectId: string;
  tasks: TaskPopulated[];
  defaultListId?: ObjectId;
}

export const ProjectListView: React.FC<ProjectListViewProps> = ({
  projectId,
  tasks,
  defaultListId,
}) => {
  const { openModal } = useUIStore();
  const { toast } = useToast();
  const permissions = useProjectPermissions(projectId);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const toggleComplete = useToggleTaskComplete();
  const deleteTask = useDeleteTask();

  // Focus input when component mounts or when enabled
  React.useEffect(() => {
    if (permissions.canEdit && inputRef.current) {
      inputRef.current.focus();
    }
  }, [permissions.canEdit]);

  // Focus edit input when editing starts
  React.useEffect(() => {
    if (editingTaskId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTaskId]);

  const handleCreateTask = () => {
    if (!newTaskTitle.trim() || !permissions.canEdit) return;
    if (!defaultListId) {
      toast.error("No list available", "Please create a list first before adding tasks");
      return;
    }

    createTask.mutate(
      {
        title: newTaskTitle.trim(),
        list: defaultListId,
        project: projectId,
        priority: "medium",
      },
      {
        onSuccess: () => {
          setNewTaskTitle("");
          if (inputRef.current) {
            inputRef.current.focus();
          }
        },
      }
    );
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCreateTask();
    } else if (e.key === "Escape") {
      setNewTaskTitle("");
    }
  };

  const handleEditStart = (task: TaskPopulated) => {
    if (!permissions.canEdit) return;
    setEditingTaskId(task._id);
    setEditingTitle(task.title);
  };

  const handleEditSave = (taskId: string) => {
    if (!editingTitle.trim()) {
      setEditingTaskId(null);
      return;
    }

    updateTask.mutate(
      {
        id: taskId,
        data: { title: editingTitle.trim() },
      },
      {
        onSuccess: () => {
          setEditingTaskId(null);
          setEditingTitle("");
        },
      }
    );
  };

  const handleEditCancel = () => {
    setEditingTaskId(null);
    setEditingTitle("");
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>, taskId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEditSave(taskId);
    } else if (e.key === "Escape") {
      handleEditCancel();
    }
  };

  const handleDelete = (taskId: string) => {
    if (!permissions.canEdit) return;
    if (window.confirm("Are you sure you want to delete this task?")) {
      deleteTask.mutate(taskId);
    }
  };

  // Sort tasks: incomplete first, then by due date, then by creation date
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return (
    <div className="space-y-2">
      {/* Inline Task Creation */}
      {permissions.canEdit && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b pb-2 mb-2"
        >
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Type and press Enter to create a task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={createTask.isPending}
              className="flex-1"
            />
            <Button
              onClick={handleCreateTask}
              disabled={!newTaskTitle.trim() || createTask.isPending}
              loading={createTask.isPending}
              size="icon"
            >
              <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Task List */}
      <AnimatePresence mode="popLayout">
        {sortedTasks.map((task) => {
          const overdue = task.dueDate && isOverdue(task.dueDate) && !task.completed;
          const isEditing = editingTaskId === task._id;

          return (
            <motion.div
              key={task._id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              layout
              className={cn(
                "group flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-all",
                task.completed && "opacity-60",
                !permissions.canEdit && "cursor-default"
              )}
            >
              {/* Completion Checkbox */}
              <button
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  task.completed
                    ? "bg-primary border-primary text-white"
                    : "border-muted-foreground hover:border-primary",
                  !permissions.canEdit && "cursor-not-allowed opacity-50"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (permissions.canEdit) {
                    toggleComplete.mutate(task._id);
                  }
                }}
                disabled={!permissions.canEdit || toggleComplete.isPending}
                title={!permissions.canEdit ? "Only editors can complete tasks" : ""}
              >
                {task.completed && (
                  <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
                )}
              </button>

              {/* Task Content */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <Input
                    ref={editInputRef}
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, task._id)}
                    onBlur={() => handleEditSave(task._id)}
                    className="h-8"
                  />
                ) : (
                  <div className="flex items-start gap-2">
                    <p
                      className={cn(
                        "font-medium flex-1",
                        task.completed && "line-through text-muted-foreground",
                        permissions.canEdit && "cursor-text hover:bg-muted/50 rounded px-1 -mx-1"
                      )}
                      onDoubleClick={() => handleEditStart(task)}
                      title={permissions.canEdit ? "Double-click to edit" : ""}
                    >
                      {task.title}
                    </p>
                    {permissions.canEdit && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openModal("taskDetail", task)}
                          title="Edit task"
                        >
                          <FontAwesomeIcon icon={faEdit} className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(task._id)}
                          title="Delete task"
                          className="text-destructive hover:text-destructive"
                        >
                          <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Task Metadata */}
                {!isEditing && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {/* Priority */}
                    <PriorityBadge priority={task.priority} />

                    {/* Due Date */}
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
                        {dayjs(task.dueDate).format("MMM D, YYYY")}
                      </span>
                    )}

                    {/* Labels */}
                    {task.labels && task.labels.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {task.labels.map((label) => (
                          <LabelBadge
                            key={label._id}
                            name={label.name}
                            color={label.color}
                          />
                        ))}
                      </div>
                    )}

                    {/* List Badge */}
                    {task.list && (
                      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {typeof task.list === "string" ? "List" : task.list.name}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Assignees */}
              {task.assignedTo && task.assignedTo.length > 0 && (
                <div className="flex -space-x-2 shrink-0">
                  {task.assignedTo.slice(0, 3).map((user) => (
                    <UserAvatar
                      key={user._id}
                      name={user.firstName || user.username || "User"}
                      src={user.avatar}
                      size="sm"
                      className="border-2 border-background"
                    />
                  ))}
                  {task.assignedTo.length > 3 && (
                    <div
                      className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium"
                      title={`+${task.assignedTo.length - 3} more`}
                    >
                      +{task.assignedTo.length - 3}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {sortedTasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No tasks in this project yet</p>
          {permissions.canEdit && (
            <p className="text-sm mt-2">Create your first task above</p>
          )}
        </div>
      )}
    </div>
  );
};
