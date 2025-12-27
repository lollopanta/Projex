/**
 * ============================================
 * TASK FILTERS
 * Filter and sort controls for task list
 * ============================================
 */

import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faFilter, faSort } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

export type PriorityFilter = "all" | "high" | "medium" | "low";
export type SortOption = "priority" | "dueDate" | "createdAt" | "title";

interface TaskFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  priorityFilter: PriorityFilter;
  onPriorityFilterChange: (filter: PriorityFilter) => void;
  blockingFilter: boolean;
  onBlockingFilterChange: (enabled: boolean) => void;
  dueSoonFilter: boolean;
  onDueSoonFilterChange: (enabled: boolean) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  className?: string;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  searchQuery,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  blockingFilter,
  onBlockingFilterChange,
  dueSoonFilter,
  onDueSoonFilterChange,
  sortBy,
  onSortChange,
  className,
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Bar */}
      <div className="relative">
        <FontAwesomeIcon
          icon={faSearch}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
        />
        <Input
          type="text"
          placeholder="Search tasks by title or description..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faFilter} className="w-4 h-4 text-muted-foreground" />
          <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High (67-100)</SelectItem>
              <SelectItem value="medium">Medium (34-66)</SelectItem>
              <SelectItem value="low">Low (0-33)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Blocking Filter */}
        <Button
          variant={blockingFilter ? "default" : "outline"}
          size="sm"
          onClick={() => onBlockingFilterChange(!blockingFilter)}
        >
          Blocking Others
        </Button>

        {/* Due Soon Filter */}
        <Button
          variant={dueSoonFilter ? "default" : "outline"}
          size="sm"
          onClick={() => onDueSoonFilterChange(!dueSoonFilter)}
        >
          Due Soon (7 days)
        </Button>

        {/* Sort */}
        <div className="flex items-center gap-2 ml-auto">
          <FontAwesomeIcon icon={faSort} className="w-4 h-4 text-muted-foreground" />
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Priority (High → Low)</SelectItem>
              <SelectItem value="dueDate">Due Date</SelectItem>
              <SelectItem value="createdAt">Created Date</SelectItem>
              <SelectItem value="title">Title (A → Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
