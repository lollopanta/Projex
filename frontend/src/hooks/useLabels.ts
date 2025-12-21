/**
 * ============================================
 * LABELS HOOKS
 * TanStack Query hooks for labels
 * ============================================
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { labelsApi } from "@/api";
import { useToast } from "@/store";
import type { CreateLabelRequest, UpdateLabelRequest, Label } from "@/types";

// Query keys
export const labelKeys = {
  all: ["labels"] as const,
  lists: () => [...labelKeys.all, "list"] as const,
};

/**
 * Hook to get all labels
 */
export const useLabels = () => {
  return useQuery({
    queryKey: labelKeys.lists(),
    queryFn: () => labelsApi.getLabels(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to create a label
 */
export const useCreateLabel = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateLabelRequest) => labelsApi.createLabel(data),
    onSuccess: (newLabel) => {
      queryClient.setQueryData<Label[]>(labelKeys.lists(), (old) => {
        return old ? [...old, newLabel].sort((a, b) => a.name.localeCompare(b.name)) : [newLabel];
      });
      toast.success("Label created", `"${newLabel.name}" has been created`);
    },
    onError: (error: Error) => {
      toast.error("Failed to create label", error.message);
    },
  });
};

/**
 * Hook to update a label
 */
export const useUpdateLabel = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLabelRequest }) =>
      labelsApi.updateLabel(id, data),
    onSuccess: (updatedLabel) => {
      queryClient.setQueryData<Label[]>(labelKeys.lists(), (old) => {
        return old
          ?.map((l) => (l._id === updatedLabel._id ? updatedLabel : l))
          .sort((a, b) => a.name.localeCompare(b.name));
      });
      toast.success("Label updated", "Your changes have been saved");
    },
    onError: (error: Error) => {
      toast.error("Failed to update label", error.message);
    },
  });
};

/**
 * Hook to delete a label
 */
export const useDeleteLabel = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => labelsApi.deleteLabel(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Label[]>(labelKeys.lists(), (old) => {
        return old?.filter((l) => l._id !== id);
      });
      toast.success("Label deleted", "The label has been removed");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete label", error.message);
    },
  });
};
