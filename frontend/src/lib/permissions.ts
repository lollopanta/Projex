/**
 * ============================================
 * PERMISSION UTILITIES
 * Check user permissions for projects and lists
 * ============================================
 */

import type { Project, List, MemberRole } from "@/types";

/**
 * Get user's role in a project
 * Returns: 'owner' | 'admin' | 'editor' | 'viewer' | null
 */
export function getProjectRole(
  project: Project,
  userId: string
): "owner" | "admin" | "editor" | "viewer" | null {
  // Check if user is owner
  const ownerId = typeof project.owner === "string" ? project.owner : project.owner._id;
  if (ownerId === userId) {
    return "owner";
  }

  // Check if user is a member
  const member = project.members.find((m) => {
    const memberUserId = typeof m.user === "string" ? m.user : m.user._id;
    return memberUserId === userId;
  });

  return member ? (member.role as MemberRole) : null;
}

/**
 * Get user's role in a list
 * Returns: 'owner' | 'admin' | 'editor' | 'viewer' | null
 */
export function getListRole(
  list: List,
  userId: string
): "owner" | "admin" | "editor" | "viewer" | null {
  // Check if user is owner
  const ownerId = typeof list.owner === "string" ? list.owner : list.owner._id;
  if (ownerId === userId) {
    return "owner";
  }

  // Check if user is a member
  const member = list.members.find((m) => {
    const memberUserId = typeof m.user === "string" ? m.user : m.user._id;
    return memberUserId === userId;
  });

  return member ? (member.role as MemberRole) : null;
}

/**
 * Check if user can view a project/list
 */
export function canView(role: "owner" | "admin" | "editor" | "viewer" | null): boolean {
  return role !== null;
}

/**
 * Check if user can edit (create/edit tasks)
 */
export function canEdit(role: "owner" | "admin" | "editor" | "viewer" | null): boolean {
  return role === "owner" || role === "admin" || role === "editor";
}

/**
 * Check if user can manage members
 */
export function canManageMembers(role: "owner" | "admin" | "editor" | "viewer" | null): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Check if user can delete project/list
 */
export function canDelete(role: "owner" | "admin" | "editor" | "viewer" | null): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Check if user can assign tasks
 */
export function canAssignTasks(role: "owner" | "admin" | "editor" | "viewer" | null): boolean {
  return role === "owner" || role === "admin" || role === "editor";
}

/**
 * Check if user can drag tasks (for Kanban/Gantt)
 */
export function canDragTasks(role: "owner" | "admin" | "editor" | "viewer" | null): boolean {
  return role === "owner" || role === "admin" || role === "editor";
}

/**
 * Get permission tooltip message
 */
export function getPermissionTooltip(
  action: string,
  role: "owner" | "admin" | "editor" | "viewer" | null
): string {
  if (!canView(role)) {
    return "You don't have access to this project";
  }

  if (action === "edit" && !canEdit(role)) {
    return "Only editors and admins can edit tasks";
  }

  if (action === "assign" && !canAssignTasks(role)) {
    return "Only editors and admins can assign tasks";
  }

  if (action === "manage" && !canManageMembers(role)) {
    return "Only admins can manage members";
  }

  if (action === "delete" && !canDelete(role)) {
    return "Only owners and admins can delete";
  }

  return "";
}
