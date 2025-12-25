/**
 * ============================================
 * CREATE PROJECT MODAL
 * Modal for creating a new project
 * ============================================
 */

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolderPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
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
import { useCreateProject } from "@/hooks/useProjects";
import { useUIStore, useToast } from "@/store";
import { cn } from "@/lib/utils";

// Validation schema
const projectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
});

type ProjectFormData = z.infer<typeof projectSchema>;

// Predefined color options
const colorOptions = [
  "#6366F1", // Indigo (default)
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
];

export const CreateProjectModal: React.FC = () => {
  const navigate = useNavigate();
  const { modal, closeModal } = useUIStore();
  const { toast } = useToast();
  const createProject = useCreateProject();
  const [selectedColor, setSelectedColor] = useState("#6366F1");

  const isOpen = modal.isOpen && modal.type === "project";

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#6366F1",
    },
  });

  // Watch color for form sync (not used but needed for form state)
  watch("color");

  const onSubmit = (data: ProjectFormData) => {
    createProject.mutate(
      {
        ...data,
        color: selectedColor,
      },
      {
        onSuccess: (newProject) => {
          reset();
          setSelectedColor("#6366F1");
          closeModal();
          toast.success("Project created", `"${newProject.name}" has been created`);
          // Navigate to the new project
          setTimeout(() => {
            navigate(`/projects/${newProject._id}`);
          }, 100);
        },
        onError: (error: Error & { response?: { data?: { errors?: Array<{ msg: string; path: string }> } } }) => {
          // Handle validation errors from backend
          if (error.response?.data?.errors) {
            const validationErrors = error.response.data.errors;
            validationErrors.forEach((err) => {
              toast.error("Validation error", `${err.path}: ${err.msg}`);
            });
          } else {
            toast.error("Failed to create project", error.message);
          }
        },
      }
    );
  };

  const handleClose = () => {
    if (!createProject.isPending) {
      reset();
      setSelectedColor("#6366F1");
      closeModal();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faFolderPlus} className="w-5 h-5" />
            Create New Project
          </DialogTitle>
          <DialogDescription>
            Create a new project to organize your tasks and collaborate with your team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="project-name">
              Project Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-name"
              placeholder="e.g., Website Redesign"
              {...register("name")}
              className={cn(errors.name && "border-destructive")}
              autoFocus
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <textarea
              id="project-description"
              placeholder="Add a description for this project..."
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

          {/* Color Picker */}
          <div className="space-y-3">
            <Label>Project Color</Label>
            <div className="flex flex-wrap gap-2.5">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setSelectedColor(color);
                    // Update form value
                    const event = { target: { value: color } };
                    register("color").onChange(event);
                  }}
                  className={cn(
                    "w-10 h-10 rounded-lg border-2 transition-all",
                    "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    selectedColor === color
                      ? "border-foreground scale-110 shadow-md"
                      : "border-muted hover:border-muted-foreground/50"
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                >
                  {selectedColor === color && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center justify-center h-full"
                    >
                      <FontAwesomeIcon icon={faXmark} className="w-4 h-4 text-white drop-shadow-lg" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
            {/* Live preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 p-3 rounded-lg border transition-colors"
              style={{ backgroundColor: `${selectedColor}15`, borderColor: selectedColor }}
            >
              <motion.div
                key={selectedColor}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-4 h-4 rounded shadow-sm"
                style={{ backgroundColor: selectedColor }}
              />
              <span className="text-sm text-muted-foreground">
                Preview: {selectedColor}
              </span>
            </motion.div>
            <input type="hidden" {...register("color")} value={selectedColor} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={createProject.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={createProject.isPending}>
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
