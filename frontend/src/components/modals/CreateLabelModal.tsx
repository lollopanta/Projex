/**
 * ============================================
 * CREATE LABEL MODAL
 * Modal for creating a new label
 * ============================================
 */

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTag } from "@fortawesome/free-solid-svg-icons";
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
import { useCreateLabel } from "@/hooks/useLabels";
import { useUIStore, useToast } from "@/store";
import { cn } from "@/lib/utils";

// Validation schema
const labelSchema = z.object({
  name: z.string().min(1, "Label name is required").max(50, "Name must be less than 50 characters"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
});

type LabelFormData = z.infer<typeof labelSchema>;

// Predefined color options
const colorOptions = [
  "#3B82F6", // Blue (default)
  "#6366F1", // Indigo
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#06B6D4", // Cyan
];

export const CreateLabelModal: React.FC = () => {
  const { modal, closeModal } = useUIStore();
  const { toast } = useToast();
  const createLabel = useCreateLabel();
  const [selectedColor, setSelectedColor] = useState("#3B82F6");

  const isOpen = modal.isOpen && modal.type === "label";

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<LabelFormData>({
    resolver: zodResolver(labelSchema),
    defaultValues: {
      name: "",
      color: "#3B82F6",
    },
  });

  const onSubmit = (data: LabelFormData) => {
    createLabel.mutate(
      {
        ...data,
        color: selectedColor,
      },
      {
        onSuccess: () => {
          reset();
          setSelectedColor("#3B82F6");
          closeModal();
        },
        onError: (error: Error & { response?: { data?: { errors?: Array<{ msg: string; path: string }> } } }) => {
          if (error.response?.data?.errors) {
            const validationErrors = error.response.data.errors;
            validationErrors.forEach((err) => {
              toast.error("Validation error", `${err.path}: ${err.msg}`);
            });
          } else {
            toast.error("Failed to create label", error.message);
          }
        },
      }
    );
  };

  const handleClose = () => {
    if (!createLabel.isPending) {
      reset();
      setSelectedColor("#3B82F6");
      closeModal();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faTag} className="w-5 h-5" />
            Create New Label
          </DialogTitle>
          <DialogDescription>
            Create a label to categorize and organize your tasks.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Label Name */}
          <div className="space-y-2">
            <Label htmlFor="label-name">
              Label Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="label-name"
              placeholder="e.g., Urgent, Work, Personal"
              {...register("name")}
              className={cn(errors.name && "border-destructive")}
              autoFocus
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Color Picker */}
          <div className="space-y-3">
            <Label>Label Color</Label>
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
            <Button type="button" variant="outline" onClick={handleClose} disabled={createLabel.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={createLabel.isPending}>
              Create Label
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
