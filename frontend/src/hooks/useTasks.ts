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
  dependencies: () => [...taskKeys.all, "dependencies"] as const,
  dependency: (id: string) => [...taskKeys.dependencies(), id] as const,
  impact: () => [...taskKeys.all, "impact"] as const,
  impactDetail: (id: string) => [...taskKeys.impact(), id] as const,
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
      // Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Snapshot previous value
      const previousTask = queryClient.getQueryData<TaskPopulated>(taskKeys.detail(id));

      // Optimistically update the task
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
    onSuccess: (updatedTask, variables) => {
      // Update the task in the detail query cache
      queryClient.setQueryData(taskKeys.detail(updatedTask._id), updatedTask);
      
      // Update the task in list queries optimistically
      queryClient.setQueriesData(
        { queryKey: taskKeys.lists(), exact: false },
        (old: any) => {
          if (!old || !old.tasks) return old;
          return {
            ...old,
            tasks: old.tasks.map((t: TaskPopulated) =>
              t._id === updatedTask._id ? updatedTask : t
            ),
          };
        }
      );
      
      // Invalidate after a short delay to allow UI to update first
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
        queryClient.invalidateQueries({ queryKey: ["projects"] });
      }, 100);
      
      toast.success("Task updated", "Your changes have been saved");
    },
    onSettled: () => {
      // Additional cleanup if needed
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

/**
 * Hook to get task dependency graph
 */
export const useTaskDependencies = (taskId: string) => {
  return useQuery({
    queryKey: taskKeys.dependency(taskId),
    queryFn: () => tasksApi.getTaskDependencies(taskId),
    enabled: !!taskId,
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Hook to add dependencies to a task
 */
export const useAddTaskDependencies = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ taskId, dependencies }: { taskId: string; dependencies: string[] }) =>
      tasksApi.addTaskDependencies(taskId, dependencies),
    onSuccess: (updatedTask) => {
      queryClient.setQueryData(taskKeys.detail(updatedTask._id), updatedTask);
      queryClient.invalidateQueries({ queryKey: taskKeys.dependency(updatedTask._id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      toast.success("Dependencies added", "Task dependencies have been updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to add dependencies", error.message);
    },
  });
};

/**
 * Hook to remove a dependency from a task
 */
export const useRemoveTaskDependency = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ taskId, dependencyId }: { taskId: string; dependencyId: string }) =>
      tasksApi.removeTaskDependency(taskId, dependencyId),
    onSuccess: (updatedTask) => {
      queryClient.setQueryData(taskKeys.detail(updatedTask._id), updatedTask);
      queryClient.invalidateQueries({ queryKey: taskKeys.dependency(updatedTask._id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      toast.success("Dependency removed", "The dependency has been removed");
    },
    onError: (error: Error) => {
      toast.error("Failed to remove dependency", error.message);
    },
  });
};

/**
 * Hook to get task impact analysis
 */
export const useTaskImpact = (taskId: string) => {
  return useQuery({
    queryKey: taskKeys.impactDetail(taskId),
    queryFn: () => tasksApi.getTaskImpact(taskId),
    enabled: !!taskId,
    staleTime: 1000 * 60, // 1 minute
  });
};
