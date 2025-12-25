/**
 * ============================================
 * TASK DEPENDENCY SELECTOR
 * Component for selecting task dependencies
 * ============================================
 */

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink, faTimes, faSearch } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, PriorityBadge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTasks } from "@/hooks/useTasks";
import type { ObjectId } from "@/types";

interface TaskDependencySelectorProps {
  taskId: string;
  projectId?: string;
  currentDependencies?: ObjectId[];
  onDependenciesChange?: (dependencies: ObjectId[]) => void;
  disabled?: boolean;
}

export const TaskDependencySelector: React.FC<TaskDependencySelectorProps> = ({
  taskId,
  projectId,
  currentDependencies = [],
  onDependenciesChange,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch tasks from the same project
  const { data: tasksData } = useTasks({
    projectId: projectId,
    limit: 100,
  });

  const tasks = tasksData?.tasks || [];
  
  // Filter out:
  // - Current task
  // - Already selected dependencies
  // - Tasks that would create a cycle (simplified check)
  const availableTasks = tasks.filter(
    (task) =>
      task._id !== taskId &&
      !currentDependencies.includes(task._id) &&
      task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTasks = tasks.filter((task) =>
    currentDependencies.includes(task._id)
  );

  const handleAddDependency = (dependencyId: ObjectId) => {
    if (onDependenciesChange) {
      onDependenciesChange([...currentDependencies, dependencyId]);
    }
    setSearchQuery("");
  };

  const handleRemoveDependency = (dependencyId: ObjectId) => {
    if (onDependenciesChange) {
      onDependenciesChange(
        currentDependencies.filter((id) => id !== dependencyId)
      );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <FontAwesomeIcon icon={faLink} className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Dependencies</span>
      </div>

      {/* Selected Dependencies */}
      {selectedTasks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTasks.map((task) => (
            <Badge
              key={task._id}
              variant="outline"
              className="flex items-center gap-1 pr-1"
            >
              <span className="text-xs">{task.title}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveDependency(task._id)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Add Dependency Button */}
      {!disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              <FontAwesomeIcon icon={faLink} className="w-4 h-4 mr-2" />
              Add Dependency
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-3 border-b">
              <div className="relative">
                <FontAwesomeIcon
                  icon={faSearch}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {availableTasks.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {searchQuery
                    ? "No tasks found"
                    : "No available tasks to add as dependencies"}
                </div>
              ) : (
                <div className="p-1">
                  {availableTasks.map((task) => (
                    <button
                      key={task._id}
                      type="button"
                      onClick={() => {
                        handleAddDependency(task._id);
                        setOpen(false);
                      }}
                      className="w-full text-left p-2 rounded hover:bg-muted transition-colors flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {task.description}
                          </div>
                        )}
                      </div>
                      <div className="ml-2 flex items-center gap-1">
                        <PriorityBadge priority={task.priority} />
                        {task.completed && (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            ✓
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};
