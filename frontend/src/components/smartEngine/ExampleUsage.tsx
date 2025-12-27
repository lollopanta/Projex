/**
 * ============================================
 * SMART ENGINE - USAGE EXAMPLES
 * Examples of how to use Smart Engine in components
 * ============================================
 */

import React from "react";
import { useTaskPriorities, useUserWorkloads, useDuplicateDetection } from "@/hooks/useSmartEngine";
import { SmartPriorityBadge } from "./PriorityBadge";
import { TimeEstimate } from "./TimeEstimate";
import { WorkloadIndicator } from "./WorkloadIndicator";

/**
 * Example 1: Show prioritized task list
 */
export const PrioritizedTaskList: React.FC<{ taskIds: string[]; projectId?: string }> = ({
  taskIds,
  projectId,
}) => {
  const { data: priorities, isLoading } = useTaskPriorities(taskIds, projectId);

  if (isLoading) return <div>Loading priorities...</div>;

  // Tasks are already sorted by priority (highest first)
  return (
    <div className="space-y-2">
      {priorities?.map((priority) => (
        <div key={priority.taskId} className="p-3 border rounded">
          <div className="flex items-center justify-between">
            <span>Task {priority.taskId}</span>
            <SmartPriorityBadge
              task={{ _id: priority.taskId } as any}
              projectId={projectId}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {priority.explanation}
          </p>
        </div>
      ))}
    </div>
  );
};

/**
 * Example 2: Show team workload overview
 */
export const TeamWorkloadOverview: React.FC<{ userIds: string[]; projectId?: string }> = ({
  userIds,
  projectId,
}) => {
  const { data: workloads, isLoading } = useUserWorkloads(userIds, projectId);

  if (isLoading) return <div>Loading workloads...</div>;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Team Workload</h3>
      {workloads?.map((workload) => (
        <WorkloadIndicator
          key={workload.userId}
          userId={workload.userId}
          showDetails
        />
      ))}
    </div>
  );
};

/**
 * Example 3: Show duplicate tasks warning
 */
export const DuplicateTasksWarning: React.FC<{ taskIds: string[]; projectId?: string }> = ({
  taskIds,
  projectId,
}) => {
  const { data: duplicates, isLoading } = useDuplicateDetection(taskIds, projectId);

  if (isLoading) return null;
  if (!duplicates || duplicates.length === 0) return null;

  return (
    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
      <p className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
        ⚠️ Duplicate Tasks Detected
      </p>
      <div className="space-y-2">
        {duplicates.map((dup) => (
          <div key={dup.taskId} className="text-sm">
            <p className="font-medium">{dup.title}</p>
            <p className="text-muted-foreground">{dup.explanation}</p>
            <ul className="list-disc list-inside mt-1">
              {dup.similarTasks.map((similar) => (
                <li key={similar.taskId}>
                  {similar.title} ({Math.round(similar.similarity * 100)}% similar)
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Example 4: Task card with Smart Engine features
 */
export const SmartTaskCard: React.FC<{
  task: any;
  projectId?: string;
  showPriority?: boolean;
  showEstimate?: boolean;
}> = ({ task, projectId, showPriority = true, showEstimate = true }) => {
  const assigneeId = task.assignedTo?.[0] 
    ? (typeof task.assignedTo[0] === 'object' ? task.assignedTo[0]._id : task.assignedTo[0])
    : undefined;

  return (
    <div className="p-4 border rounded-lg space-y-2">
      <div className="flex items-start justify-between">
        <h4 className="font-semibold">{task.title}</h4>
        {showPriority && (
          <SmartPriorityBadge task={task} projectId={projectId} />
        )}
      </div>
      
      {showEstimate && (
        <TimeEstimate
          taskId={task._id}
          userId={assigneeId}
          projectId={projectId}
        />
      )}

      {task.assignedTo && task.assignedTo.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Workload:</span>
          {task.assignedTo.map((user: any) => {
            const userId = typeof user === 'object' ? user._id : user;
            return (
              <WorkloadIndicator key={userId} userId={userId} />
            );
          })}
        </div>
      )}
    </div>
  );
};
