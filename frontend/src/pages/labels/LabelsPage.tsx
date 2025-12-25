/**
 * ============================================
 * LABELS PAGE
 * View all labels and filter tasks by label
 * ============================================
 */

import React from "react";
import { useSearchParams } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTag, faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTaskCard } from "@/components/ui/skeleton";
import { useLabels, useDeleteLabel } from "@/hooks/useLabels";
import { useTasks } from "@/hooks/useTasks";
import { useUIStore } from "@/store";
import { TaskList } from "@/components/tasks/TaskList";
import { cn } from "@/lib/utils";
import type { Label } from "@/types";

export const LabelsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLabelId = searchParams.get("id");
  const { openModal } = useUIStore();
  const { data: labels, isLoading: labelsLoading } = useLabels();
  const deleteLabel = useDeleteLabel();

  const { data: tasksData, isLoading: tasksLoading } = useTasks({
    label: selectedLabelId || undefined,
    limit: 100,
  });

  const tasks = tasksData?.tasks || [];
  const selectedLabel = labels?.find((l) => l._id === selectedLabelId);

  const handleLabelClick = (labelId: string) => {
    setSearchParams({ id: labelId });
  };

  const handleClearFilter = () => {
    setSearchParams({});
  };

  const handleDeleteLabel = (labelId: string, labelName: string) => {
    if (confirm(`Are you sure you want to delete the label "${labelName}"?`)) {
      deleteLabel.mutate(labelId);
      if (selectedLabelId === labelId) {
        handleClearFilter();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FontAwesomeIcon icon={faTag} className="w-8 h-8 text-primary" />
            Labels
          </h1>
          <p className="text-muted-foreground mt-1">
            Organize tasks with labels
          </p>
        </div>
        <Button onClick={() => openModal("label")}>
          <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
          New Label
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Labels Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>All Labels</CardTitle>
            </CardHeader>
            <CardContent>
              {labelsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : labels && labels.length > 0 ? (
                <div className="space-y-2">
                  {labels.map((label: Label) => (
                    <div
                      key={label._id}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors group",
                        selectedLabelId === label._id
                          ? "bg-primary/10 border-2 border-primary"
                          : "hover:bg-muted border-2 border-transparent"
                      )}
                      onClick={() => handleLabelClick(label._id)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className="w-4 h-4 rounded shrink-0"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="font-medium truncate">{label.name}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLabel(label._id, label.name);
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity p-1"
                        onMouseEnter={(e) => {
                          e.currentTarget.parentElement?.classList.add("group");
                        }}
                      >
                        <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={faTag}
                  title="No labels yet"
                  description="Create labels to categorize your tasks."
                  action={{
                    label: "Create Label",
                    onClick: () => openModal("label"),
                  }}
                  className="py-8"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tasks */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {selectedLabel
                  ? `Tasks with "${selectedLabel.name}" label`
                  : "All Tasks"}
              </CardTitle>
              {selectedLabelId && (
                <Button variant="ghost" size="sm" onClick={handleClearFilter}>
                  <FontAwesomeIcon icon={faXmark} className="mr-2 h-4 w-4" />
                  Clear Filter
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="space-y-3">
                  <SkeletonTaskCard />
                  <SkeletonTaskCard />
                  <SkeletonTaskCard />
                </div>
              ) : tasks.length > 0 ? (
                <TaskList tasks={tasks} />
              ) : selectedLabel ? (
                <EmptyState
                  icon={faTag}
                  title={`No tasks with "${selectedLabel.name}" label`}
                  description="Tasks tagged with this label will appear here."
                  className="py-12"
                />
              ) : (
                <EmptyState
                  icon={faTag}
                  title="No tasks"
                  description="Select a label to filter tasks, or create tasks with labels."
                  className="py-12"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LabelsPage;
