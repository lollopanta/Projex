/**
 * ============================================
 * PROJECT MEMBERS PANEL
 * Manage project members (add, update role, remove)
 * ============================================
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserPlus,
  faTrash,
  faChevronDown,
  faUser,
  faShield,
  faEdit,
  faEye,
} from "@fortawesome/free-solid-svg-icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/ui/badge";
import { useProject, useAddProjectMember, useUpdateProjectMemberRole, useRemoveProjectMember } from "@/hooks/useProjects";
import { useSearchUsers } from "@/hooks/useUsers";
import { useAuthStore, useToast } from "@/store";
import { cn, debounce } from "@/lib/utils";
import { getProjectRole, canManageMembers } from "@/lib/permissions";
import type { Project, MemberRole, UserPublic } from "@/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

interface ProjectMembersPanelProps {
  projectId: string;
}

export const ProjectMembersPanel: React.FC<ProjectMembersPanelProps> = ({ projectId }) => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { data: project } = useProject(projectId);
  const addMember = useAddProjectMember();
  const updateRole = useUpdateProjectMemberRole();
  const removeMember = useRemoveProjectMember();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<MemberRole>("editor");
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  const debouncedSearch = debounce((query: string) => {
    // Search is handled by useSearchUsers hook
  }, 300);

  const { data: searchResults = [] } = useSearchUsers(searchQuery);

  if (!project || !user) return null;

  const userRole = getProjectRole(project, user._id);
  const canManage = canManageMembers(userRole);

  // Get all existing member IDs (including owner)
  const existingMemberIds = new Set([
    typeof project.owner === "string" ? project.owner : project.owner._id,
    ...project.members.map((m) => (typeof m.user === "string" ? m.user : m.user._id)),
  ]);

  // Filter out already-added users from search results
  const availableUsers = searchResults.filter(
    (u) => !existingMemberIds.has(u._id)
  );

  const handleAddMember = () => {
    if (!selectedUserId) {
      toast.error("Please select a user", "Choose a user from the search results");
      return;
    }

    addMember.mutate(
      {
        projectId,
        data: {
          userId: selectedUserId,
          role: selectedRole,
        },
      },
      {
        onSuccess: () => {
          setSearchQuery("");
          setSelectedUserId(null);
          setSelectedRole("editor");
        },
      }
    );
  };

  const handleUpdateRole = (memberId: string, newRole: MemberRole) => {
    updateRole.mutate({
      projectId,
      memberId,
      role: newRole,
    });
  };

  const handleRemoveMember = (memberId: string) => {
    removeMember.mutate({ projectId, memberId });
    setMemberToRemove(null);
  };

  const getRoleIcon = (role: MemberRole | "owner") => {
    switch (role) {
      case "owner":
      case "admin":
        return faShield;
      case "editor":
        return faEdit;
      case "viewer":
        return faEye;
      default:
        return faUser;
    }
  };

  const ownerId = typeof project.owner === "string" ? project.owner : project.owner._id;
  const ownerData = typeof project.owner === "string" ? null : project.owner;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FontAwesomeIcon icon={faUser} className="w-5 h-5" />
          Members
        </CardTitle>
        <CardDescription>
          Manage who can access and edit this project
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Member Section */}
        {canManage && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <Label className="text-base font-semibold">Add Member</Label>
            
            {/* User Search */}
            <div className="space-y-2">
              <Label htmlFor="user-search">Search Users</Label>
              <div className="relative">
                <Input
                  id="user-search"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    debouncedSearch(e.target.value);
                  }}
                  className="pr-10"
                />
                <FontAwesomeIcon
                  icon={faUser}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                />
              </div>

              {/* Search Results */}
              {searchQuery.length >= 2 && availableUsers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border rounded-lg bg-background shadow-lg max-h-48 overflow-y-auto"
                >
                  {availableUsers.map((user) => (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(user._id);
                        setSearchQuery(
                          user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.username
                        );
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors",
                        selectedUserId === user._id && "bg-muted"
                      )}
                    >
                      <UserAvatar
                        name={user.firstName || user.username}
                        src={user.avatar}
                        size="sm"
                      />
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.username}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      {selectedUserId === user._id && (
                        <FontAwesomeIcon
                          icon={faChevronDown}
                          className="w-4 h-4 text-primary rotate-90"
                        />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}

              {searchQuery.length >= 2 && availableUsers.length === 0 && (
                <p className="text-sm text-muted-foreground px-2">
                  No users found
                </p>
              )}
            </div>

            {/* Role Selector */}
            {selectedUserId && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-2"
              >
                <Label htmlFor="member-role">Role</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value) => setSelectedRole(value as MemberRole)}
                >
                  <SelectTrigger id="member-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
                        Viewer - Read only
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                        Editor - Can create and edit tasks
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faShield} className="w-4 h-4" />
                        Admin - Full control
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>
            )}

            {/* Add Button */}
            <Button
              onClick={handleAddMember}
              disabled={!selectedUserId || addMember.isPending}
              loading={addMember.isPending}
              className="w-full"
            >
              <FontAwesomeIcon icon={faUserPlus} className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </div>
        )}

        {/* Members List */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Project Members</Label>

          {/* Owner */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              <UserAvatar
                name={ownerData?.firstName || ownerData?.username || "Owner"}
                src={ownerData?.avatar}
                size="sm"
              />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">
                    {ownerData?.firstName && ownerData?.lastName
                      ? `${ownerData.firstName} ${ownerData.lastName}`
                      : ownerData?.username || "Project Owner"}
                  </p>
                  <RoleBadge role="owner" />
                </div>
                <p className="text-xs text-muted-foreground">{ownerData?.email}</p>
              </div>
            </div>
            <FontAwesomeIcon
              icon={getRoleIcon("owner")}
              className="w-4 h-4 text-muted-foreground"
            />
          </div>

          {/* Members */}
          {project.members.map((member) => {
            const memberUser = typeof member.user === "string" ? null : member.user;
            const memberId = typeof member.user === "string" ? member.user : member.user._id;
            const isCurrentUser = memberId === user._id;

            return (
              <div
                key={memberId}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <UserAvatar
                    name={memberUser?.firstName || memberUser?.username || "User"}
                    src={memberUser?.avatar}
                    size="sm"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {memberUser?.firstName && memberUser?.lastName
                          ? `${memberUser.firstName} ${memberUser.lastName}`
                          : memberUser?.username || "Unknown User"}
                        {isCurrentUser && " (You)"}
                      </p>
                      <RoleBadge role={member.role} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {memberUser?.email || "No email"}
                    </p>
                  </div>
                </div>

                {canManage && !isCurrentUser && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <FontAwesomeIcon icon={faChevronDown} className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleUpdateRole(memberId, "viewer")}
                        disabled={member.role === "viewer" || updateRole.isPending}
                      >
                        <FontAwesomeIcon icon={faEye} className="mr-2 w-4 h-4" />
                        Set as Viewer
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleUpdateRole(memberId, "editor")}
                        disabled={member.role === "editor" || updateRole.isPending}
                      >
                        <FontAwesomeIcon icon={faEdit} className="mr-2 w-4 h-4" />
                        Set as Editor
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleUpdateRole(memberId, "admin")}
                        disabled={member.role === "admin" || updateRole.isPending}
                      >
                        <FontAwesomeIcon icon={faShield} className="mr-2 w-4 h-4" />
                        Set as Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setMemberToRemove({
                            id: memberId,
                            name:
                              memberUser?.firstName && memberUser?.lastName
                                ? `${memberUser.firstName} ${memberUser.lastName}`
                                : memberUser?.username || "this user",
                          })
                        }
                        className="text-destructive focus:text-destructive"
                      >
                        <FontAwesomeIcon icon={faTrash} className="mr-2 w-4 h-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}

          {project.members.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No additional members. Add members to collaborate on this project.
            </p>
          )}
        </div>
      </CardContent>

      {/* Remove Confirmation Dialog */}
      <ConfirmDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        title="Remove Member"
        description={`Are you sure you want to remove ${memberToRemove?.name} from this project? They will be unassigned from all tasks.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={() => memberToRemove && handleRemoveMember(memberToRemove.id)}
        variant="destructive"
      />
    </Card>
  );
};
