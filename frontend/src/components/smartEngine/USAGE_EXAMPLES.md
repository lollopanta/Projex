# Smart Engine Frontend Integration - Usage Examples

This document provides complete examples of how to use the Smart Engine components in your React application.

## Quick Start

### 1. Basic Task List with Smart Engine

```tsx
import { SmartTaskList } from "@/components/smartEngine";

function MyTasksPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">My Tasks</h1>
      <SmartTaskList />
    </div>
  );
}
```

### 2. Project-Specific Task List

```tsx
import { SmartTaskList } from "@/components/smartEngine";
import { useParams } from "react-router-dom";

function ProjectTasksPage() {
  const { projectId } = useParams();
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Project Tasks</h1>
      <SmartTaskList projectId={projectId} />
    </div>
  );
}
```

### 3. Smart Dashboard

```tsx
import { SmartDashboard } from "@/components/smartEngine";

function DashboardPage() {
  const userIds = ["user1", "user2", "user3"]; // Optional: specific users
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Smart Dashboard</h1>
      <SmartDashboard userIds={userIds} />
    </div>
  );
}
```

### 4. Individual Components

#### Priority Badge Only

```tsx
import { SmartPriorityBadge } from "@/components/smartEngine";
import { useTaskPriority } from "@/hooks/useSmartEngine";

function TaskRow({ task, projectId }) {
  const { data: priority, isLoading } = useTaskPriority(task._id, projectId);
  
  return (
    <div className="flex items-center gap-2">
      <span>{task.title}</span>
      <SmartPriorityBadge priority={priority} isLoading={isLoading} />
    </div>
  );
}
```

#### Time Estimate Only

```tsx
import { TimeEstimate } from "@/components/smartEngine";

function TaskInfo({ task }) {
  const assigneeId = task.assignedTo?.[0]?._id;
  
  return (
    <div>
      <h3>{task.title}</h3>
      <TimeEstimate 
        taskId={task._id}
        userId={assigneeId}
        projectId={task.project?._id}
      />
    </div>
  );
}
```

#### Workload Indicator

```tsx
import { WorkloadIndicator } from "@/components/smartEngine";

function UserCard({ userId }) {
  return (
    <div className="p-4 border rounded">
      <h3>User Workload</h3>
      <WorkloadIndicator userId={userId} showDetails />
    </div>
  );
}
```

## Complete Integration Example

```tsx
import React, { useState } from "react";
import { SmartTaskList, SmartDashboard } from "@/components/smartEngine";
import { Button } from "@/components/ui/button";

function SmartEnginePage() {
  const [view, setView] = useState<"dashboard" | "list">("dashboard");
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Smart Engine</h1>
        <div className="flex gap-2">
          <Button 
            variant={view === "dashboard" ? "default" : "outline"}
            onClick={() => setView("dashboard")}
          >
            Dashboard
          </Button>
          <Button 
            variant={view === "list" ? "default" : "outline"}
            onClick={() => setView("list")}
          >
            Task List
          </Button>
        </div>
      </div>
      
      {view === "dashboard" ? (
        <SmartDashboard />
      ) : (
        <SmartTaskList />
      )}
    </div>
  );
}
```

## Features Explained

### Priority Badge
- **Color Coding**: Green (0-33), Yellow (34-66), Red (67-100)
- **Tooltip**: Shows explanation and reasons on hover
- **Auto-updates**: When task data changes

### Filters
- **Priority**: Filter by High/Medium/Low
- **Blocking**: Show only tasks blocking others
- **Due Soon**: Tasks due in next 7 days
- **Search**: Filter by title/description

### Sorting
- **Priority**: Highest priority first
- **Due Date**: Earliest due date first
- **Created Date**: Newest first
- **Title**: Alphabetical

### Notifications
- Automatically shows toast when priority jumps significantly
- Tracks priority changes in localStorage

### Real-time Updates
- Polls every 60 seconds for fresh data
- Updates when tasks are modified
- Optimistic UI updates

## Customization

### Custom Priority Colors

Modify `SmartPriorityBadge.tsx`:

```tsx
const getPriorityColor = (score: number): string => {
  if (score >= 80) return "bg-red-600"; // Custom red
  if (score >= 50) return "bg-yellow-500"; // Custom yellow
  return "bg-green-500"; // Custom green
};
```

### Custom Filters

Extend `TaskFilters.tsx` to add more filter options.

### Custom Styling

All components accept `className` prop for custom styling.

## Mock Data for Development

```tsx
import { mockPriorityResult, mockWorkloadResult } from "@/components/smartEngine/mocks";

// Use in development
const mockPriority = mockPriorityResult("task_id", 75);
const mockWorkload = mockWorkloadResult("user_id", 85);
```

## Error Handling

All components handle errors gracefully:
- Loading states with skeletons
- Error messages via toast
- Fallback UI when data unavailable

## Performance Tips

1. **Batch Priority Requests**: Use `useTaskPriorities` for multiple tasks
2. **Memoization**: Components use `useMemo` for expensive calculations
3. **Query Caching**: TanStack Query caches results automatically
4. **Debouncing**: Search input can be debounced (not implemented by default)

## Accessibility

- All interactive elements have ARIA labels
- Keyboard navigation supported
- Screen reader friendly tooltips
- Focus management
