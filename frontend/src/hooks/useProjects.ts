/**
 * ============================================
 * PROJECTS HOOKS
 * TanStack Query hooks for projects
 * ============================================
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "@/api";
import { useToast } from "@/store";
import type {
  CreateProjectRequest,
  UpdateProjectRequest,
  AddProjectMemberRequest,
  Project,
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
      toast.success("Member removed", "The user has been removed from the project");
    },
    onError: (error: Error) => {
      toast.error("Failed to remove member", error.message);
    },
  });
};
