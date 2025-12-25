/**
 * ============================================
 * PROJECTS HOOKS
 * TanStack Query hooks for projects
 * ============================================
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "@/api/projects";
import { useToast } from "@/store";
import type {
  CreateProjectRequest,
  UpdateProjectRequest,
  AddProjectMemberRequest,
  Project,
  KanbanColumn,
  CreateKanbanColumnRequest,
  UpdateKanbanColumnRequest,
} from "@/types";

// Query keys
export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

/**
 * Hook to get all projects
 */
export const useProjects = () => {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: () => projectsApi.getProjects(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

/**
 * Hook to get a single project
 */
export const useProject = (id: string) => {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectsApi.getProjectById(id),
    enabled: !!id,
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Hook to create a project
 */
export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateProjectRequest) => projectsApi.createProject(data),
    onSuccess: (newProject) => {
      // Update the projects list cache
      queryClient.setQueryData<Project[]>(projectKeys.lists(), (old) => {
        return old ? [newProject, ...old] : [newProject];
      });
      toast.success("Project created", `"${newProject.name}" has been created`);
    },
    onError: (error: Error) => {
      toast.error("Failed to create project", error.message);
    },
  });
};

/**
 * Hook to update a project
 */
export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectRequest }) =>
      projectsApi.updateProject(id, data),
    onSuccess: (updatedProject) => {
      // Update the project detail cache
      queryClient.setQueryData(projectKeys.detail(updatedProject._id), updatedProject);
      // Update the projects list cache
      queryClient.setQueryData<Project[]>(projectKeys.lists(), (old) => {
        return old?.map((p) => (p._id === updatedProject._id ? updatedProject : p));
      });
      toast.success("Project updated", "Your changes have been saved");
    },
    onError: (error: Error) => {
      toast.error("Failed to update project", error.message);
    },
  });
};

/**
 * Hook to delete a project
 */
export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => projectsApi.deleteProject(id),
    onSuccess: (_, id) => {
      // Remove from projects list cache
      queryClient.setQueryData<Project[]>(projectKeys.lists(), (old) => {
        return old?.filter((p) => p._id !== id);
      });
      // Remove detail cache
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) });
      toast.success("Project deleted", "The project has been removed");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete project", error.message);
    },
  });
};

/**
 * Hook to add a member to a project
 */
export const useAddProjectMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: AddProjectMemberRequest }) =>
      projectsApi.addProjectMember(projectId, data),
    onSuccess: (updatedProject) => {
      queryClient.setQueryData(projectKeys.detail(updatedProject._id), updatedProject);
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      toast.success("Member added", "The user has been added to the project");
    },
    onError: (error: Error) => {
      toast.error("Failed to add member", error.message);
    },
  });
};

/**
 * Hook to update a member's role in a project
 */
export const useUpdateProjectMemberRole = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      projectId,
      memberId,
      role,
    }: {
      projectId: string;
      memberId: string;
      role: "viewer" | "editor" | "admin";
    }) => projectsApi.updateProjectMemberRole(projectId, memberId, role),
    onSuccess: (updatedProject) => {
      queryClient.setQueryData(projectKeys.detail(updatedProject._id), updatedProject);
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      toast.success("Member role updated", "The member's role has been changed");
    },
    onError: (error: Error) => {
      toast.error("Failed to update member role", error.message);
    },
  });
};

/**
 * Hook to remove a member from a project
 */
export const useRemoveProjectMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ projectId, memberId }: { projectId: string; memberId: string }) =>
      projectsApi.removeProjectMember(projectId, memberId),
    onSuccess: (updatedProject) => {
      queryClient.setQueryData(projectKeys.detail(updatedProject._id), updatedProject);
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      // Also invalidate tasks to reflect unassignment
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Member removed", "The user has been removed from the project");
    },
    onError: (error: Error) => {
      toast.error("Failed to remove member", error.message);
    },
  });
};

// ============================================
// KANBAN COLUMNS HOOKS
// ============================================

// Query keys for Kanban columns
export const kanbanColumnKeys = {
  all: ["kanbanColumns"] as const,
  project: (projectId: string) => [...kanbanColumnKeys.all, "project", projectId] as const,
};

/**
 * Hook to get all Kanban columns for a project
 */
export const useKanbanColumns = (projectId: string) => {
  return useQuery({
    queryKey: kanbanColumnKeys.project(projectId),
    queryFn: () => projectsApi.getKanbanColumns(projectId),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

/**
 * Hook to create a Kanban column
 */
export const useCreateKanbanColumn = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CreateKanbanColumnRequest }) =>
      projectsApi.createKanbanColumn(projectId, data),
    onSuccess: (newColumn, variables) => {
      // Invalidate to refetch all columns (including defaults if they were just created)
      queryClient.invalidateQueries({ queryKey: kanbanColumnKeys.project(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) });
      toast.success("Column created", `"${newColumn.name}" has been added`);
    },
    onError: (error: Error) => {
      toast.error("Failed to create column", error.message);
    },
  });
};

/**
 * Hook to update a Kanban column
 */
export const useUpdateKanbanColumn = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      projectId,
      columnId,
      data,
    }: {
      projectId: string;
      columnId: string;
      data: UpdateKanbanColumnRequest;
    }) => projectsApi.updateKanbanColumn(projectId, columnId, data),
    onSuccess: (updatedColumn, variables) => {
      // Update the columns cache
      queryClient.setQueryData<KanbanColumn[]>(kanbanColumnKeys.project(variables.projectId), (old) => {
        return old?.map((col) => (col._id === updatedColumn._id ? updatedColumn : col));
      });
      // Invalidate project
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) });
      toast.success("Column updated", "Your changes have been saved");
    },
    onError: (error: Error) => {
      toast.error("Failed to update column", error.message);
    },
  });
};

/**
 * Hook to delete a Kanban column
 */
export const useDeleteKanbanColumn = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ projectId, columnId }: { projectId: string; columnId: string }) =>
      projectsApi.deleteKanbanColumn(projectId, columnId),
    onSuccess: (_, variables) => {
      // Remove from columns cache
      queryClient.setQueryData<KanbanColumn[]>(kanbanColumnKeys.project(variables.projectId), (old) => {
        return old?.filter((col) => col._id !== variables.columnId);
      });
      // Invalidate project and tasks
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Column deleted", "The column has been removed");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete column", error.message);
    },
  });
};

/**
 * Hook to reorder Kanban columns
 */
export const useReorderKanbanColumns = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ projectId, columnIds }: { projectId: string; columnIds: string[] }) =>
      projectsApi.reorderKanbanColumns(projectId, columnIds),
    onSuccess: (reorderedColumns, variables) => {
      // Update the columns cache with new order (positions are already updated from backend)
      queryClient.setQueryData<KanbanColumn[]>(
        kanbanColumnKeys.project(variables.projectId),
        reorderedColumns
      );
      // Invalidate project to ensure consistency
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) });
      toast.success("Columns reordered", "Column order has been updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to reorder columns", error.message);
    },
  });
};
