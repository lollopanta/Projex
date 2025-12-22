/**
 * ============================================
 * TASK DETAIL MODAL
 * View and edit task details
 * ============================================
 */

import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faClock,
  faTag,
  faUser,
  faFlag,
  faList,
  faFolderOpen,
  faTrash,
  faEdit,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge, PriorityBadge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { useTask, useUpdateTask, useDeleteTask, useToggleTaskComplete } from "@/hooks/useTasks";
import { useUIStore, useToast } from "@/store";
import { cn, isOverdue } from "@/lib/utils";
import type { TaskPopulated, Priority } from "@/types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

// Validation schema for updates
const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.string().optional(),
});

type UpdateTaskFormData = z.infer<typeof updateTaskSchema>;

export const TaskDetailModal: React.FC = () => {
  const { modal, closeModal } = useUIStore();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const isOpen = modal.isOpen && modal.type === "taskDetail";
  const taskData = modal.data as TaskPopulated | undefined;
  const taskId = taskData?._id;

  // Only fetch if we have a taskId and modal is open
  const { data: task, isLoading } = useTask(taskId || "");

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const toggleComplete = useToggleTaskComplete();

  const displayTask = task || taskData;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<UpdateTaskFormData>({
    resolver: zodResolver(updateTaskSchema),
    defaultValues: {
      title: displayTask?.title || "",
      description: displayTask?.description || "",
      priority: displayTask?.priority || "medium",
      dueDate: displayTask?.dueDate
        ? dayjs(displayTask.dueDate).format("YYYY-MM-DDTHH:mm")
        : "",
    },
  });

  const onSubmit = (data: UpdateTaskFormData) => {
    if (!taskId) return;

    const updateData: Partial<UpdateTaskFormData> = {};
    if (data.title !== displayTask?.title) updateData.title = data.title;
    if (data.description !== displayTask?.description) updateData.description = data.description;
    if (data.priority !== displayTask?.priority) updateData.priority = data.priority;
    if (data.dueDate !== (displayTask?.dueDate ? dayjs(displayTask.dueDate).format("YYYY-MM-DDTHH:mm") : "")) {
      updateData.dueDate = data.dueDate;
    }

    if (Object.keys(updateData).length === 0) {
      setIsEditing(false);
      return;
    }

    updateTask.mutate(
      { id: taskId, data: updateData },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!taskId) return;
    if (window.confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
      deleteTask.mutate(taskId, {
        onSuccess: () => {
          closeModal();
        },
      });
    }
  };

  // Reset editing state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      reset();
    }
  }, [isOpen, reset]);

  const handleToggleComplete = () => {
    if (!taskId) return;
    toggleComplete.mutate(taskId);
  };

  if (!isOpen) {
    return null;
  }

  if (!displayTask && !isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={closeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Task not found</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">The task you're looking for doesn't exist.</p>
          <Button onClick={closeModal}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  const overdue = displayTask.dueDate && isOverdue(displayTask.dueDate) && !displayTask.completed;

  return (
    <Dialog open={isOpen} onOpenChange={closeModal}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faList} className="w-5 h-5" />
            Task Details
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-32 bg-muted animate-pulse rounded" />
          </div>
        ) : isEditing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input {...register("title")} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                {...register("description")}
                rows={4}
                className={cn(
                  "flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["low", "medium", "high"] as Priority[]).map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="datetime-local" {...register("dueDate")} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={updateTask.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Title and Actions */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <button
                  onClick={handleToggleComplete}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-ring",
                    displayTask.completed
                      ? "bg-primary border-primary text-white"
                      : "border-muted-foreground hover:border-primary"
                  )}
                >
                  {displayTask.completed && (
                    <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
                  )}
                </button>
                <div className="flex-1">
                  <h2
                    className={cn(
                      "text-2xl font-bold",
                      displayTask.completed && "line-through text-muted-foreground"
                    )}
                  >
                    {displayTask.title}
                  </h2>
                  {displayTask.description && (
                    <p className="text-muted-foreground mt-2 whitespace-pre-wrap">
                      {displayTask.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="text-destructive hover:text-destructive"
                >
                  <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4">
              {displayTask.list && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FontAwesomeIcon icon={faList} className="w-4 h-4" />
                    List
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: displayTask.list.color }}
                    />
                    <span className="font-medium">{displayTask.list.name}</span>
                  </div>
                </div>
              )}

              {displayTask.project && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FontAwesomeIcon icon={faFolderOpen} className="w-4 h-4" />
                    Project
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: displayTask.project.color }}
                    />
                    <span className="font-medium">{displayTask.project.name}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FontAwesomeIcon icon={faFlag} className="w-4 h-4" />
                  Priority
                </div>
                <PriorityBadge priority={displayTask.priority} />
              </div>

              {displayTask.dueDate && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FontAwesomeIcon icon={faClock} className="w-4 h-4" />
                    Due Date
                  </div>
                  <span className={cn("font-medium", overdue && "text-destructive")}>
                    {dayjs(displayTask.dueDate).format("MMMM D, YYYY [at] h:mm A")}
                  </span>
                </div>
              )}
            </div>

            {/* Labels */}
            {displayTask.labels && displayTask.labels.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FontAwesomeIcon icon={faTag} className="w-4 h-4" />
                  Labels
                </div>
                <div className="flex flex-wrap gap-2">
                  {displayTask.labels.map((label) => (
                    <Badge
                      key={label._id}
                      className="text-white"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Assigned To */}
            {displayTask.assignedTo && displayTask.assignedTo.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FontAwesomeIcon icon={faUser} className="w-4 h-4" />
                  Assigned To
                </div>
                <div className="flex flex-wrap gap-2">
                  {displayTask.assignedTo.map((user) => (
                    <div key={user._id} className="flex items-center gap-2">
                      <UserAvatar
                        name={user.firstName || user.username}
                        src={user.avatar}
                        size="sm"
                      />
                      <span className="text-sm font-medium">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.username}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subtasks */}
            {displayTask.subtasks && displayTask.subtasks.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Subtasks</div>
                <div className="space-y-2">
                  {displayTask.subtasks.map((subtask, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded border">
                      <input
                        type="checkbox"
                        checked={subtask.completed}
                        readOnly
                        className="w-4 h-4"
                      />
                      <span
                        className={cn(
                          "flex-1",
                          subtask.completed && "line-through text-muted-foreground"
                        )}
                      >
                        {subtask.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
