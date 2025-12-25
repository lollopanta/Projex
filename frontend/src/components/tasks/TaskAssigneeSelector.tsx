/**
 * ============================================
 * TASK ASSIGNEE SELECTOR
 * Component for assigning/unassigning users to tasks
 * ============================================
 */

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserPlus,
  faXmark,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UserAvatar } from "@/components/ui/avatar";
import { useSearchUsers } from "@/hooks/useUsers";
import { useProject } from "@/hooks/useProjects";
import { useList } from "@/hooks/useLists";
import { cn } from "@/lib/utils";
import type { UserPublic, ObjectId } from "@/types";

interface TaskAssigneeSelectorProps {
  assignees: UserPublic[];
  projectId?: string | null;
  listId?: string | null;
  onChange: (userIds: ObjectId[]) => void;
  disabled?: boolean;
  maxDisplay?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const TaskAssigneeSelector: React.FC<TaskAssigneeSelectorProps> = ({
  assignees,
  projectId,
  listId,
  onChange,
  disabled = false,
  maxDisplay = 3,
  size = "md",
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Get project and list to determine available members
  const { data: project } = useProject(projectId || "");
  const { data: list } = useList(listId || "");

  // Get available members (project members or list members)
  const availableMembers = useMemo(() => {
    const memberSet = new Set<string>();
    const members: UserPublic[] = [];

    // Add project members
    if (project) {
      const ownerId = typeof project.owner === "string" ? project.owner : project.owner._id;
      const ownerData = typeof project.owner === "string" ? null : project.owner;
      
      if (ownerData && !memberSet.has(ownerId)) {
        memberSet.add(ownerId);
        members.push({
          _id: ownerId,
          username: ownerData.username,
          email: ownerData.email,
          firstName: ownerData.firstName,
          lastName: ownerData.lastName,
          avatar: ownerData.avatar,
        });
      }

      project.members.forEach((member) => {
        const memberId = typeof member.user === "string" ? member.user : member.user._id;
        const memberData = typeof member.user === "string" ? null : member.user;
        
        if (memberData && !memberSet.has(memberId)) {
          memberSet.add(memberId);
          members.push({
            _id: memberId,
            username: memberData.username,
            email: memberData.email,
            firstName: memberData.firstName,
            lastName: memberData.lastName,
            avatar: memberData.avatar,
          });
        }
      });
    }

    // If list has restricted members, filter to only those
    if (list && list.members && list.members.length > 0) {
      const listMemberIds = new Set(
        list.members.map((m) => (typeof m.user === "string" ? m.user : m.user._id))
      );
      return members.filter((m) => listMemberIds.has(m._id));
    }

    return members;
  }, [project, list]);

  // Search users if query is provided
  const { data: searchResults = [] } = useSearchUsers(searchQuery);

  // Combine available members with search results, filtering out already assigned
  const assigneeIds = new Set(assignees.map((a) => a._id));
  const availableForAssignment = useMemo(() => {
    const combined = [...availableMembers];
    
    if (searchQuery.length >= 2 && searchResults.length > 0) {
      searchResults.forEach((user) => {
        if (!assigneeIds.has(user._id) && !combined.find((u) => u._id === user._id)) {
          // Only add if user is a project/list member
          const isMember = availableMembers.some((m) => m._id === user._id);
          if (isMember) {
            combined.push(user);
          }
        }
      });
    }

    return combined.filter((u) => !assigneeIds.has(u._id));
  }, [availableMembers, searchResults, searchQuery, assigneeIds]);

  const handleToggleAssignee = (userId: ObjectId) => {
    if (disabled) return;

    const isAssigned = assignees.some((a) => a._id === userId);
    if (isAssigned) {
      onChange(assignees.filter((a) => a._id !== userId).map((a) => a._id));
    } else {
      onChange([...assignees.map((a) => a._id), userId]);
    }
  };

  const handleRemoveAssignee = (userId: ObjectId, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(assignees.filter((a) => a._id !== userId).map((a) => a._id));
  };

  const avatarSize = size === "sm" ? "sm" : size === "md" ? "md" : "lg";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Assigned Users */}
      <div className="flex items-center gap-1">
        {assignees.slice(0, maxDisplay).map((user) => (
          <motion.div
            key={user._id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="relative group"
          >
            <UserAvatar
              name={user.firstName || user.username}
              src={user.avatar}
              size={avatarSize}
              className="border-2 border-background cursor-pointer hover:ring-2 hover:ring-ring transition-all"
            />
            {!disabled && (
              <button
                onClick={(e) => handleRemoveAssignee(user._id, e)}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
              >
                <FontAwesomeIcon icon={faXmark} className="w-2.5 h-2.5" />
              </button>
            )}
          </motion.div>
        ))}

        {/* Overflow indicator */}
        {assignees.length > maxDisplay && (
          <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
            +{assignees.length - maxDisplay}
          </div>
        )}
      </div>

      {/* Add Assignee Button */}
      {!disabled && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full",
                size === "sm" && "h-6 w-6",
                size === "lg" && "h-10 w-10"
              )}
            >
              <FontAwesomeIcon icon={faUserPlus} className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-3 border-b">
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {availableForAssignment.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {searchQuery.length >= 2
                    ? "No matching members found"
                    : "No available members"}
                </div>
              ) : (
                <div className="p-1">
                  {availableForAssignment.map((user) => {
                    const isAssigned = assignees.some((a) => a._id === user._id);
                    return (
                      <button
                        key={user._id}
                        type="button"
                        onClick={() => {
                          handleToggleAssignee(user._id);
                          if (!isAssigned) {
                            setSearchQuery("");
                          }
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors",
                          isAssigned && "bg-primary/10"
                        )}
                      >
                        <UserAvatar
                          name={user.firstName || user.username}
                          src={user.avatar}
                          size="sm"
                        />
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium">
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user.username}
                          </p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        {isAssigned && (
                          <FontAwesomeIcon
                            icon={faChevronDown}
                            className="w-4 h-4 text-primary rotate-90"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Empty State */}
      {assignees.length === 0 && disabled && (
        <span className="text-xs text-muted-foreground">Unassigned</span>
      )}
    </div>
  );
};
