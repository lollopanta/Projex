/**
 * ============================================
 * COMMENTS HOOKS
 * TanStack Query hooks for comments
 * ============================================
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { commentsApi } from "@/api";
import { useToast } from "@/store";
import type { CreateCommentRequest, UpdateCommentRequest, Comment } from "@/types";

// Query keys
export const commentKeys = {
  all: ["comments"] as const,
  lists: () => [...commentKeys.all, "list"] as const,
  list: (taskId: string) => [...commentKeys.lists(), taskId] as const,
};

/**
 * Hook to get comments for a task
 */
export const useComments = (taskId: string) => {
  return useQuery({
    queryKey: commentKeys.list(taskId),
    queryFn: () => commentsApi.getTaskComments(taskId),
    enabled: !!taskId,
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Hook to create a comment
 */
export const useCreateComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateCommentRequest) => commentsApi.createComment(data),
    onSuccess: (newComment, variables) => {
      queryClient.setQueryData<Comment[]>(commentKeys.list(variables.task), (old) => {
        return old ? [newComment, ...old] : [newComment];
      });
      toast.success("Comment added", "Your comment has been posted");
    },
    onError: (error: Error) => {
      toast.error("Failed to add comment", error.message);
    },
  });
};

/**
 * Hook to update a comment
 */
export const useUpdateComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      taskId: string;
      data: UpdateCommentRequest;
    }) => commentsApi.updateComment(id, data),
    onSuccess: (updatedComment, { taskId }) => {
      queryClient.setQueryData<Comment[]>(commentKeys.list(taskId), (old) => {
        return old?.map((c) => (c._id === updatedComment._id ? updatedComment : c));
      });
      toast.success("Comment updated", "Your changes have been saved");
    },
    onError: (error: Error) => {
      toast.error("Failed to update comment", error.message);
    },
  });
};

/**
 * Hook to delete a comment
 */
export const useDeleteComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id }: { id: string; taskId: string }) => commentsApi.deleteComment(id),
    onSuccess: (_, { id, taskId }) => {
      queryClient.setQueryData<Comment[]>(commentKeys.list(taskId), (old) => {
        return old?.filter((c) => c._id !== id);
      });
      toast.success("Comment deleted", "Your comment has been removed");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete comment", error.message);
    },
  });
};
