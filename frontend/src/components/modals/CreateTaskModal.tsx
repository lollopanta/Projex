/**
 * ============================================
 * CREATE TASK MODAL
 * Modal for creating a new task
 * ============================================
 */

import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faCalendar,
  faUser,
  faFlag,
} from "@fortawesome/free-solid-svg-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { useCreateTask } from "@/hooks/useTasks";
import { useLists } from "@/hooks/useLists";
import { useProjects } from "@/hooks/useProjects";
import { useLabels } from "@/hooks/useLabels";
import { useUIStore, useToast } from "@/store";
import { cn } from "@/lib/utils";
import type { Priority, ObjectId } from "@/types";

// Validation schema
const taskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
  list: z.string().min(1, "List is required"),
  project: z.string().optional(),
  assignedTo: z.array(z.string()).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  labels: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface CreateTaskModalProps {
  defaultListId?: ObjectId;
  defaultProjectId?: ObjectId;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  defaultListId,
  defaultProjectId,
}) => {
  const { modal, closeModal } = useUIStore();
  const { toast } = useToast();
  const createTask = useCreateTask();
  const { data: lists, isLoading: listsLoading } = useLists();
  const { data: projects } = useProjects();
  const { data: labels } = useLabels();

  const isOpen = modal.isOpen && modal.type === "task";

  // Get default list/project from modal data or props
  const modalData = modal.data as { listId?: ObjectId; projectId?: ObjectId } | undefined;
  const initialListId = defaultListId || modalData?.listId;
  const initialProjectId = defaultProjectId || modalData?.projectId;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      list: initialListId || "",
      project: initialProjectId || "",
      assignedTo: [],
      priority: "medium",
      labels: [],
      dueDate: "",
    },
  });

  const selectedList = watch("list");
  const selectedProject = watch("project");

  // Filter lists by selected project
  // If no project selected: show all lists
  // If project selected: show lists in that project OR lists without a project
  const availableLists = lists?.filter((list) => {
    if (!selectedProject || selectedProject === "__none__" || selectedProject === "") {
      // Show all lists when no project is selected
      return true;
    }
    
    // If project is selected, show lists that belong to that project OR have no project
    const listProjectId = typeof list.project === "string" ? list.project : list.project?._id;
    return listProjectId === selectedProject || !listProjectId;
  }) || [];

  // Update project when list changes
  useEffect(() => {
    if (selectedList) {
      const list = lists?.find((l) => l._id === selectedList);
      if (list?.project) {
        const projectId = typeof list.project === "string" ? list.project : list.project._id;
        if (projectId !== selectedProject && projectId) {
          setValue("project", projectId);
        }
      }
    }
  }, [selectedList, lists, selectedProject, setValue]);

  // Reset list selection if it becomes invalid when project changes
  useEffect(() => {
    if (selectedList && availableLists.length > 0) {
      const isListValid = availableLists.some((list) => list._id === selectedList);
      if (!isListValid) {
        // Current list is not available for selected project, reset it
        setValue("list", "");
      }
    } else if (selectedList && availableLists.length === 0 && !listsLoading) {
      // No lists available for selected project, reset selection
      setValue("list", "");
    }
  }, [selectedProject, availableLists, selectedList, setValue, listsLoading]);

  const onSubmit = (data: TaskFormData) => {
    createTask.mutate(
      {
        title: data.title,
        description: data.description,
        list: data.list as ObjectId,
        project: data.project && data.project !== "__none__" ? (data.project as ObjectId) : undefined,
        assignedTo: data.assignedTo as ObjectId[],
        priority: data.priority,
        labels: data.labels as ObjectId[],
        dueDate: data.dueDate || undefined,
      },
      {
        onSuccess: () => {
          reset();
          closeModal();
        },
        onError: (error: Error & { response?: { data?: { errors?: Array<{ msg: string; path: string }> } } }) => {
          if (error.response?.data?.errors) {
            const validationErrors = error.response.data.errors;
            validationErrors.forEach((err) => {
              toast.error("Validation error", `${err.path}: ${err.msg}`);
            });
          } else {
            toast.error("Failed to create task", error.message);
          }
        },
      }
    );
  };

  const handleClose = () => {
    if (!createTask.isPending) {
      reset();
      closeModal();
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const priorityColors = {
    low: "text-blue-600 dark:text-blue-400",
    medium: "text-yellow-600 dark:text-yellow-400",
    high: "text-red-600 dark:text-red-400",
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faPlus} className="w-5 h-5" />
            Create New Task
          </DialogTitle>
          <DialogDescription>
            Add a new task to organize your work and track progress.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">
              Task Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="task-title"
              placeholder="e.g., Review design mockups"
              {...register("title")}
              className={cn(errors.title && "border-destructive")}
              autoFocus
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <textarea
              id="task-description"
              placeholder="Add more details about this task..."
              {...register("description")}
              rows={3}
              className={cn(
                "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                errors.description && "border-destructive"
              )}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* List Selection */}
          <div className="space-y-2">
            <Label htmlFor="task-list">
              List <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="list"
              control={control}
              render={({ field }) => (
                <Select value={field.value || ""} onValueChange={field.onChange}>
                  <SelectTrigger id="task-list" className={cn(errors.list && "border-destructive")}>
                    <SelectValue placeholder="Select a list">
                      {lists?.find((l) => l._id === field.value)?.name || "Select a list"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {listsLoading ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Loading lists...
                      </div>
                    ) : availableLists.length > 0 ? (
                      availableLists.map((list) => (
                        <SelectItem key={list._id} value={list._id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded"
                              style={{ backgroundColor: list.color }}
                            />
                            <span>{list.name}</span>
                            {list.project && (
                              <span className="text-xs text-muted-foreground">
                                ({typeof list.project === "object" ? list.project.name : "Project"})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {lists && lists.length === 0
                          ? "No lists found. Create a list first."
                          : selectedProject
                          ? "No lists available for this project"
                          : "No lists available"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.list && (
              <p className="text-sm text-destructive">{errors.list.message}</p>
            )}
          </div>

          {/* Project Selection (optional) */}
          <div className="space-y-2">
            <Label htmlFor="task-project">Project (optional)</Label>
            <Controller
              name="project"
              control={control}
              render={({ field }) => {
                // Use special value "__none__" for "No project" option
                // Always provide a value to keep Select controlled
                const selectValue = field.value || "__none__";
                
                return (
                  <Select 
                    value={selectValue} 
                    onValueChange={(value) => {
                      // Convert "__none__" to empty string for form state
                      field.onChange(value === "__none__" ? "" : value);
                    }}
                  >
                    <SelectTrigger id="task-project">
                      <SelectValue placeholder="Select a project">
                        {field.value && field.value !== "__none__" && projects?.find((p) => p._id === field.value)?.name || "No project"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No project</SelectItem>
                      {projects?.map((project) => (
                        <SelectItem key={project._id} value={project._id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded"
                              style={{ backgroundColor: project.color }}
                            />
                            {project.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              }}
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Controller
              name="priority"
              control={control}
              defaultValue="medium"
              render={({ field }) => (
                <div className="flex gap-2">
                  {(["low", "medium", "high"] as Priority[]).map((priority) => (
                    <motion.button
                      key={priority}
                      type="button"
                      onClick={() => field.onChange(priority)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        field.value === priority
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-muted hover:border-muted-foreground/50"
                      )}
                    >
                      <FontAwesomeIcon
                        icon={faFlag}
                        className={cn("mr-1", priorityColors[priority])}
                      />
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </motion.button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="task-due-date">Due Date</Label>
            <div className="relative">
              <Input
                id="task-due-date"
                type="datetime-local"
                {...register("dueDate")}
                className="pl-10"
              />
              <FontAwesomeIcon
                icon={faCalendar}
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              />
            </div>
          </div>

          {/* Labels */}
          {labels && labels.length > 0 && (
            <div className="space-y-2">
              <Label>Labels</Label>
              <div className="flex flex-wrap gap-2.5">
                {labels.map((label) => (
                  <Controller
                    key={label._id}
                    name="labels"
                    control={control}
                    render={({ field }) => {
                      const isSelected = field.value?.includes(label._id);
                      return (
                        <motion.button
                          key={label._id}
                          type="button"
                          onClick={() => {
                            const current = field.value || [];
                            if (isSelected) {
                              field.onChange(current.filter((id) => id !== label._id));
                            } else {
                              field.onChange([...current, label._id]);
                            }
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                            isSelected
                              ? "text-white shadow-md"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                          style={
                            isSelected
                              ? { backgroundColor: label.color }
                              : undefined
                          }
                        >
                          {label.name}
                        </motion.button>
                      );
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Assigned To - Simplified for now */}
          <div className="space-y-2">
            <Label>Assigned To</Label>
            <div className="text-sm text-muted-foreground">
              <FontAwesomeIcon icon={faUser} className="mr-2" />
              User assignment feature coming soon
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={createTask.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={createTask.isPending}>
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
