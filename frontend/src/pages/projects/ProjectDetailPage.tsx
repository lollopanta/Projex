/**
 * ============================================
 * PROJECT DETAIL PAGE
 * View project details with tasks and lists
 * ============================================
 */

import React, { useState } from "react";
import { useParams, Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFolderOpen,
  faPlus,
  faListCheck,
  faChevronLeft,
  faFilter,
  faBrain,
} from "@fortawesome/free-solid-svg-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/hooks/useProjects";
import { useLists } from "@/hooks/useLists";
import { useTasks } from "@/hooks/useTasks";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useUIStore } from "@/store";
import { TaskList } from "@/components/tasks/TaskList";
import { ProjectViewSwitcher, type ProjectViewType } from "@/components/projects/ProjectViewSwitcher";
import { ProjectListView } from "@/components/projects/ProjectListView";
import { ProjectTableView } from "@/components/projects/ProjectTableView";
import { ProjectKanbanView } from "@/components/projects/ProjectKanbanView";
import { ProjectGanttView } from "@/components/projects/ProjectGanttView";
import { TaskFilterInput } from "@/components/projects/TaskFilterInput";
import { KanbanColumnManager } from "@/components/projects/KanbanColumnManager";
import { parseFilterQuery, evaluateFilter } from "@/lib/queryParser";
import type { List, TaskPopulated } from "@/types";

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { openModal } = useUIStore();
  
  // Early return if no ID
  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h1 className="text-2xl font-bold mb-2">Invalid Project</h1>
        <p className="text-muted-foreground mb-4">Project ID is missing.</p>
        <Link to="/projects">
          <Button>Back to Projects</Button>
        </Link>
      </div>
    );
  }
  
  const { data: project, isLoading, error, isError } = useProject(id);
  const { data: lists, isLoading: listsLoading } = useLists({ projectId: id });
  const { data: tasksData } = useTasks({ projectId: id, limit: 100 });
  const permissions = useProjectPermissions(id);

  const [currentView, setCurrentView] = useState<ProjectViewType>("list");
  const [filterQuery, setFilterQuery] = useState("");

  const tasks = tasksData?.tasks || [];
  const projectLists = lists || [];
  
  // Get first list ID for default task creation
  const defaultListId = projectLists.length > 0 ? projectLists[0]._id : undefined;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full lg:col-span-2" />
        </div>
      </div>
    );
  }

  // Check for errors or if project doesn't exist after loading
  if (isError || (!isLoading && !project)) {
    let errorMessage = "The project you're looking for doesn't exist or you don't have permission to view it.";
    
    if (error) {
      // Try to extract error message from API response
      const apiError = error as Error & { response?: { data?: { message?: string } } };
      if (apiError.response?.data?.message) {
        errorMessage = apiError.response.data.message;
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
    }
    
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h1 className="text-2xl font-bold mb-2">Project not found</h1>
        <p className="text-muted-foreground mb-4">{errorMessage}</p>
        <Link to="/projects">
          <Button>Back to Projects</Button>
        </Link>
      </div>
    );
  }

  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/projects">
          <Button variant="ghost" size="icon">
            <FontAwesomeIcon icon={faChevronLeft} className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: project?.color || "#6366F1" }}
            >
              <FontAwesomeIcon icon={faFolderOpen} className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{project?.name || "Project"}</h1>
              {project?.description && (
                <p className="text-muted-foreground mt-1">{project.description}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/projects/${id}/smart-engine`}>
            <Button variant="outline" title="Smart Engine">
              <FontAwesomeIcon icon={faBrain} className="mr-2 h-4 w-4" />
              Smart Engine
            </Button>
          </Link>
          {permissions.canEdit && (
            <Button variant="outline" onClick={() => openModal("task", { projectId: id })}>
              <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          )}
          {permissions.canManageMembers && (
            <Button variant="outline" onClick={() => openModal("list", { projectId: id })}>
              <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
              Add List
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{tasks.length}</p>
              </div>
              <FontAwesomeIcon icon={faListCheck} className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingTasks.length}</p>
              </div>
              <FontAwesomeIcon icon={faListCheck} className="w-8 h-8 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedTasks.length}</p>
              </div>
              <FontAwesomeIcon icon={faListCheck} className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lists</p>
                <p className="text-2xl font-bold">{projectLists.length}</p>
              </div>
              <FontAwesomeIcon icon={faListCheck} className="w-8 h-8 text-secondary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lists */}
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FontAwesomeIcon icon={faListCheck} className="w-5 h-5" />
                Lists
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openModal("list", { projectId: id })}
              >
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {listsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : projectLists.length > 0 ? (
                <div className="space-y-2">
                  {projectLists.map((list: List) => (
                    <Link key={list._id} to={`/lists/${list._id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: list.color }}
                        />
                        <span className="font-medium flex-1">{list.name}</span>
                        <FontAwesomeIcon
                          icon={faChevronLeft}
                          className="w-3 h-3 text-muted-foreground rotate-180"
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={faListCheck}
                  title="No lists"
                  description="Create a list to organize tasks in this project."
                  action={{
                    label: "Create List",
                    onClick: () => openModal("list", { projectId: id }),
                  }}
                  className="py-8"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tasks - Full Width for Advanced Views */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faListCheck} className="w-5 h-5" />
                  Tasks
                </CardTitle>
                <ProjectViewSwitcher
                  currentView={currentView}
                  onViewChange={setCurrentView}
                />
              </div>
              
              {/* Filter Input */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <FontAwesomeIcon
                    icon={faFilter}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                  />
                  <TaskFilterInput
                    value={filterQuery}
                    onChange={setFilterQuery}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                // Apply filter if query exists
                let filteredTasks: TaskPopulated[] = tasks;
                if (filterQuery.trim()) {
                  const { expression, error } = parseFilterQuery(filterQuery);
                  if (!error && expression) {
                    filteredTasks = tasks.filter((task) => evaluateFilter(expression, task));
                  } else if (error) {
                    // If there's a parse error, show all tasks but error is displayed in input
                    filteredTasks = tasks;
                  }
                }

                if (filteredTasks.length === 0) {
                  const hasActiveFilter = filterQuery.trim().length > 0;
                  return (
                    <EmptyState
                      icon={faListCheck}
                      title={hasActiveFilter ? "No task found" : "No tasks yet"}
                      description={
                        hasActiveFilter
                          ? "No task matches the current filter parameters."
                          : "Add tasks to this project to get started."
                      }
                      action={
                        !hasActiveFilter && permissions.canEdit
                          ? {
                              label: "Add Task",
                              onClick: () => openModal("task", { projectId: id }),
                            }
                          : undefined
                      }
                      className="py-8"
                    />
                  );
                }

                switch (currentView) {
                  case "list":
                    return (
                      <ProjectListView
                        projectId={id || ""}
                        tasks={filteredTasks}
                        defaultListId={defaultListId as string | undefined}
                      />
                    );
                  case "table":
                    return (
                      <ProjectTableView
                        projectId={id || ""}
                        tasks={filteredTasks}
                      />
                    );
                    case "kanban":
                      return (
                        <div className="space-y-4">
                          {permissions.canManageMembers && (
                            <Card>
                              <CardContent className="pt-6">
                                <KanbanColumnManager projectId={id || ""} />
                              </CardContent>
                            </Card>
                          )}
                          <ProjectKanbanView
                            projectId={id || ""}
                            tasks={filteredTasks}
                          />
                        </div>
                      );
                  case "gantt":
                    return (
                      <ProjectGanttView
                        projectId={id || ""}
                        tasks={filteredTasks}
                      />
                    );
                  default:
                    return (
                      <TaskList tasks={filteredTasks} showCompleted={true} />
                    );
                }
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;
