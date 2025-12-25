/**
 * ============================================
 * PROJECT PERMISSIONS HOOK
 * React hook to get user permissions for a project
 * ============================================
 */

import { useMemo } from "react";
import { useAuthStore } from "@/store";
import { useProject } from "@/hooks/useProjects";
import {
  getProjectRole,
  canView,
  canEdit,
  canManageMembers,
  canDelete,
  canAssignTasks,
  canDragTasks,
} from "@/lib/permissions";

export function useProjectPermissions(projectId: string) {
  const { user } = useAuthStore();
  const { data: project } = useProject(projectId);

  return useMemo(() => {
    if (!project || !user) {
      return {
        role: null,
        canView: false,
        canEdit: false,
        canManageMembers: false,
        canDelete: false,
        canAssignTasks: false,
        canDragTasks: false,
      };
    }

    const role = getProjectRole(project, user._id);

    return {
      role,
      canView: canView(role),
      canEdit: canEdit(role),
      canManageMembers: canManageMembers(role),
      canDelete: canDelete(role),
      canAssignTasks: canAssignTasks(role),
      canDragTasks: canDragTasks(role),
    };
  }, [project, user]);
}
