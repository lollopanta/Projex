/**
 * ============================================
 * INBOX PAGE
 * Tasks without a list or project (inbox)
 * ============================================
 */

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInbox, faPlus } from "@fortawesome/free-solid-svg-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonTaskCard } from "@/components/ui/skeleton";
import { useTasks } from "@/hooks/useTasks";
import { useUIStore } from "@/store";
import { TaskList } from "@/components/tasks/TaskList";

export const InboxPage: React.FC = () => {
  const { openModal } = useUIStore();

  // Fetch tasks without list/project (inbox tasks)
  const { data, isLoading } = useTasks({
    limit: 100,
  });

  // Filter tasks that don't have a list or project
  const inboxTasks = data?.tasks.filter((task) => {
    const listId = typeof task.list === "string" ? task.list : task.list?._id;
    const projectId = typeof task.project === "string" ? task.project : task.project?._id;
    return !listId && !projectId;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FontAwesomeIcon icon={faInbox} className="w-8 h-8 text-primary" />
            Inbox
          </h1>
          <p className="text-muted-foreground mt-1">
            Tasks that haven't been organized into a list or project
          </p>
        </div>
        <Button onClick={() => openModal("task")}>
          <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faInbox} className="w-5 h-5" />
            Inbox Tasks ({inboxTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <SkeletonTaskCard />
              <SkeletonTaskCard />
              <SkeletonTaskCard />
            </div>
          ) : inboxTasks.length > 0 ? (
            <TaskList tasks={inboxTasks} />
          ) : (
            <EmptyState
              icon={faInbox}
              title="Your inbox is empty"
              description="All your tasks are organized. Create a new task to add it to your inbox."
              action={{
                label: "Create Task",
                onClick: () => openModal("task"),
              }}
              className="py-12"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InboxPage;
