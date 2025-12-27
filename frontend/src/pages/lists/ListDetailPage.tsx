/**
 * ============================================
 * LIST DETAIL PAGE
 * View list details with tasks
 * ============================================
 */

import React from "react";
import { useParams, Link } from "react-router";
import type { List } from "@/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faListCheck,
  faPlus,
  faChevronLeft,
  faBrain,
} from "@fortawesome/free-solid-svg-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useList, useDeleteList } from "@/hooks/useLists";
import { useTasks } from "@/hooks/useTasks";
import { useUIStore } from "@/store";
import { TaskList } from "@/components/tasks/TaskList";

export const ListDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { openModal } = useUIStore();
  const { data: list, isLoading, error, isError } = useList(id || "");
  const { data: tasksData } = useTasks({ listId: id, limit: 100 });
  const deleteList = useDeleteList();

  const tasks = tasksData?.tasks || [];

  // Delete handler available for future use
  const _handleDelete = () => {
    if (!id) return;
    if (window.confirm("Are you sure you want to delete this list? This will also delete all tasks in this list. This action cannot be undone.")) {
      deleteList.mutate(id, {
        onSuccess: () => {
          window.location.href = "/";
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Check for errors or if list doesn't exist after loading
  if (isError || (!isLoading && !list)) {
    let errorMessage = "The list you're looking for doesn't exist or you don't have permission to view it.";
    
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
        <h1 className="text-2xl font-bold mb-2">List not found</h1>
        <p className="text-muted-foreground mb-4">{errorMessage}</p>
        <Link to="/">
          <Button>Back to Dashboard</Button>
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
        <Link to="/">
          <Button variant="ghost" size="icon">
            <FontAwesomeIcon icon={faChevronLeft} className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: list.color }}
            >
              <FontAwesomeIcon icon={faListCheck} className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{list.name}</h1>
              {list.description && (
                <p className="text-muted-foreground mt-1">{list.description}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {list.project && (
            <Link
              to={`/projects/${
                typeof list.project === "object" && list.project !== null
                  ? list.project._id
                  : list.project
              }/smart-engine`}
            >
              <Button variant="outline" title="Smart Engine">
                <FontAwesomeIcon icon={faBrain} className="mr-2 h-4 w-4" />
                Smart Engine
              </Button>
            </Link>
          )}
          <Button onClick={() => openModal("task", { listId: id })}>
            <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      </div>

      {/* Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
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
              description="Add tasks to this list to get started."
              action={{
                label: "Add Task",
                onClick: () => openModal("task", { listId: id }),
              }}
              className="py-12"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ListDetailPage;
