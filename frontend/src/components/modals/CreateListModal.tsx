/**
 * ============================================
 * CREATE LIST MODAL
 * Modal for creating a new list
 * ============================================
 */

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faListCheck } from "@fortawesome/free-solid-svg-icons";
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
import { useCreateList } from "@/hooks/useLists";
import { useProjects } from "@/hooks/useProjects";
import { useUIStore, useToast } from "@/store";
import { cn } from "@/lib/utils";

// Validation schema
const listSchema = z.object({
  name: z.string().min(1, "List name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  project: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
});

type ListFormData = z.infer<typeof listSchema>;

// Predefined color options
const colorOptions = [
  "#8B5CF6", // Purple (default)
  "#6366F1", // Indigo
  "#EC4899", // Pink
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
];

export const CreateListModal: React.FC = () => {
  const navigate = useNavigate();
  const { modal, closeModal } = useUIStore();
  const { toast } = useToast();
  const createList = useCreateList();
  const { data: projects } = useProjects();
  const [selectedColor, setSelectedColor] = useState("#8B5CF6");

  const isOpen = modal.isOpen && modal.type === "list";

  // Get default project from modal data if provided
  const modalData = modal.data as { projectId?: string } | undefined;
  const initialProjectId = modalData?.projectId;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ListFormData>({
    resolver: zodResolver(listSchema),
    defaultValues: {
      name: "",
      description: "",
      project: initialProjectId || "",
      color: "#8B5CF6",
    },
  });

  const onSubmit = (data: ListFormData) => {
    createList.mutate(
      {
        ...data,
        color: selectedColor,
        project: data.project && data.project !== "__none__" ? data.project : undefined,
      },
      {
        onSuccess: (newList) => {
          reset();
          setSelectedColor("#8B5CF6");
          closeModal();
          toast.success("List created", `"${newList.name}" has been created`);
          // Navigate to the new list
          setTimeout(() => {
            navigate(`/lists/${newList._id}`);
          }, 100);
        },
        onError: (error: Error & { response?: { data?: { errors?: Array<{ msg: string; path: string }> } } }) => {
          if (error.response?.data?.errors) {
            const validationErrors = error.response.data.errors;
            validationErrors.forEach((err) => {
              toast.error("Validation error", `${err.path}: ${err.msg}`);
            });
          } else {
            toast.error("Failed to create list", error.message);
          }
        },
      }
    );
  };

  const handleClose = () => {
    if (!createList.isPending) {
      reset();
      setSelectedColor("#8B5CF6");
      closeModal();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faListCheck} className="w-5 h-5" />
            Create New List
          </DialogTitle>
          <DialogDescription>
            Create a new list to organize your tasks.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* List Name */}
          <div className="space-y-2">
            <Label htmlFor="list-name">
              List Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="list-name"
              placeholder="e.g., Personal Tasks"
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
            <Label htmlFor="list-description">Description</Label>
            <textarea
              id="list-description"
              placeholder="Add a description for this list..."
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

          {/* Project Selection (optional) */}
          <div className="space-y-2">
            <Label htmlFor="list-project">Project (optional)</Label>
            <Select
              value={watch("project") || undefined}
              onValueChange={(value) => setValue("project", value === "__none__" ? "" : value)}
            >
              <SelectTrigger id="list-project">
                <SelectValue placeholder="Select a project">
                  {watch("project") && projects?.find((p) => p._id === watch("project"))?.name || "No project"}
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
          </div>

          {/* Color Picker */}
          <div className="space-y-3">
            <Label>List Color</Label>
            <div className="flex flex-wrap gap-2.5">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setSelectedColor(color);
                    setValue("color", color);
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
                      <span className="text-white text-xs font-bold">✓</span>
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
            <Button type="button" variant="outline" onClick={handleClose} disabled={createList.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={createList.isPending}>
              Create List
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
