/**
 * ============================================
 * TASKS HOOKS
 * TanStack Query hooks for tasks
 * ============================================
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { tasksApi } from "@/api";
import { useToast } from "@/store";
import type {
  CreateTaskRequest,
  UpdateTaskRequest,
  CreateSubtaskRequest,
  TaskPopulated,
  TaskQueryParams,
  PaginatedResponse,
} from "@/types";

// Query keys
export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (filters?: TaskQueryParams) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  infinite: (filters?: TaskQueryParams) => [...taskKeys.all, "infinite", filters] as const,
};

/**
 * Hook to get tasks with filtering
 */
export const useTasks = (params?: TaskQueryParams) => {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => tasksApi.getTasks(params),
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Hook to get tasks with infinite scroll
 */
export const useInfiniteTasks = (params?: Omit<TaskQueryParams, "page">) => {
  return useInfiniteQuery({
    queryKey: taskKeys.infinite(params),
    queryFn: ({ pageParam = 1 }) => tasksApi.getTasks({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: PaginatedResponse<TaskPopulated>) => {
      if (lastPage.pagination.page < lastPage.pagination.pages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Hook to get a single task
 */
export const useTask = (id: string) => {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => tasksApi.getTaskById(id),
    enabled: !!id,
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Hook to create a task
 */
export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateTaskRequest) => tasksApi.createTask(data),
    onSuccess: (newTask) => {
      // Invalidate all task lists to refetch
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      toast.success("Task created", `"${newTask.title}" has been added`);
    },
    onError: (error: Error) => {
      toast.error("Failed to create task", error.message);
    },
  });
};

/**
 * Hook to update a task
 */
export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskRequest }) =>
      tasksApi.updateTask(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(id) });

      // Snapshot previous value
      const previousTask = queryClient.getQueryData<TaskPopulated>(taskKeys.detail(id));

      // Optimistically update
      if (previousTask) {
        queryClient.setQueryData<TaskPopulated>(taskKeys.detail(id), {
          ...previousTask,
          ...data,
        } as TaskPopulated);
      }

      return { previousTask };
    },
    onError: (error: Error, { id }, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(id), context.previousTask);
      }
      toast.error("Failed to update task", error.message);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
    onSuccess: () => {
      toast.success("Task updated", "Your changes have been saved");
    },
  });
};

/**
 * Hook to delete a task
 */
export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => tasksApi.deleteTask(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      toast.success("Task deleted", "The task has been removed");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete task", error.message);
    },
  });
};

/**
 * Hook to toggle task completion
 */
export const useToggleTaskComplete = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => tasksApi.toggleTaskComplete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(id) });

      const previousTask = queryClient.getQueryData<TaskPopulated>(taskKeys.detail(id));

      if (previousTask) {
        queryClient.setQueryData<TaskPopulated>(taskKeys.detail(id), {
          ...previousTask,
          completed: !previousTask.completed,
          completedAt: previousTask.completed ? null : new Date().toISOString(),
        });
      }

      return { previousTask };
    },
    onError: (error: Error, id, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(id), context.previousTask);
      }
      toast.error("Failed to update task", error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
    onSuccess: (task) => {
      toast.success(
        task.completed ? "Task completed" : "Task reopened",
        task.completed ? "Great job! 🎉" : "Task marked as incomplete"
      );
    },
  });
};

/**
 * Hook to add a subtask
 */
export const useAddSubtask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: CreateSubtaskRequest }) =>
      tasksApi.addSubtask(taskId, data),
    onSuccess: (updatedTask) => {
      queryClient.setQueryData(taskKeys.detail(updatedTask._id), updatedTask);
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      toast.success("Subtask added", "The subtask has been created");
    },
    onError: (error: Error) => {
      toast.error("Failed to add subtask", error.message);
    },
  });
};
