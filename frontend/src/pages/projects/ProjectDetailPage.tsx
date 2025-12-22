/**
 * ============================================
 * PROJECT DETAIL PAGE
 * View project details with tasks and lists
 * ============================================
 */

import React from "react";
import { useParams, Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFolderOpen,
  faPlus,
  faListCheck,
  faChevronLeft,
} from "@fortawesome/free-solid-svg-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTaskCard } from "@/components/ui/skeleton";
import { useProject, useDeleteProject } from "@/hooks/useProjects";
import { useLists } from "@/hooks/useLists";
import { useTasks } from "@/hooks/useTasks";
import { useUIStore } from "@/store";
import { TaskList } from "@/components/tasks/TaskList";
// ConfirmDialog not needed - using native confirm for now
import { cn } from "@/lib/utils";
import type { List } from "@/types";

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { openModal } = useUIStore();
  const { data: project, isLoading, error, isError } = useProject(id || "");
  const { data: lists } = useLists({ projectId: id });
  const { data: tasksData } = useTasks({ projectId: id, limit: 100 });
  const deleteProject = useDeleteProject();

  const tasks = tasksData?.tasks || [];
  const projectLists = lists || [];

  const handleDelete = () => {
    if (!id) return;
    if (window.confirm("Are you sure you want to delete this project? This will also delete all tasks and lists in this project. This action cannot be undone.")) {
      deleteProject.mutate(id, {
        onSuccess: () => {
          window.location.href = "/projects";
        },
      });
    }
  };

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
              style={{ backgroundColor: project.color }}
            >
              <FontAwesomeIcon icon={faFolderOpen} className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{project.name}</h1>
              {project.description && (
                <p className="text-muted-foreground mt-1">{project.description}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => openModal("task", { projectId: id })}>
            <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
            Add Task
          </Button>
          <Button variant="outline" onClick={() => openModal("list", { projectId: id })}>
            <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
            Add List
          </Button>
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
              {projectLists.length > 0 ? (
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

        {/* Tasks */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FontAwesomeIcon icon={faListCheck} className="w-5 h-5" />
                Tasks
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openModal("task", { projectId: id })}
              >
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {pendingTasks.length > 0 ? (
                <TaskList tasks={pendingTasks} showCompleted={false} />
              ) : completedTasks.length > 0 ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">All tasks completed!</p>
                  <TaskList tasks={completedTasks} />
                </div>
              ) : (
                <EmptyState
                  icon={faListCheck}
                  title="No tasks yet"
                  description="Add tasks to this project to get started."
                  action={{
                    label: "Add Task",
                    onClick: () => openModal("task", { projectId: id }),
                  }}
                  className="py-8"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;
