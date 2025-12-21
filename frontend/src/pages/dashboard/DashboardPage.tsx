/**
 * ============================================
 * DASHBOARD PAGE
 * Main dashboard with task overview
 * ============================================
 */

import React from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faListCheck,
  faCheck,
  faClock,
  faCalendarDay,
  faFolderOpen,
  faChevronRight,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonTaskCard } from "@/components/ui/skeleton";
import { PriorityBadge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/common/EmptyState";
import { useAuthStore, useUIStore } from "@/store";
import { useTasks, useProjects } from "@/hooks";
import { cn, isOverdue } from "@/lib/utils";
import type { TaskPopulated, Project } from "@/types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

// Stats Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  to?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, to }) => {
  const content = (
    <Card hoverable={!!to}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <span style={{ color }}>{icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }
  return content;
};

// Task Item Component
interface TaskItemProps {
  task: TaskPopulated;
  onComplete?: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task }) => {
  const { openModal } = useUIStore();
  const overdue = task.dueDate && isOverdue(task.dueDate) && !task.completed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer",
        task.completed && "opacity-60"
      )}
      onClick={() => openModal("taskDetail", task)}
    >
      <button
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
          task.completed
            ? "bg-primary border-primary text-white"
            : "border-muted-foreground hover:border-primary"
        )}
        onClick={(e) => {
          e.stopPropagation();
          // Toggle completion would be handled here
        }}
      >
        {task.completed && (
          <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-medium truncate",
            task.completed && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.dueDate && (
            <span
              className={cn(
                "text-xs flex items-center gap-1",
                overdue ? "text-destructive" : "text-muted-foreground"
              )}
            >
              <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
              {dayjs(task.dueDate).fromNow()}
            </span>
          )}
          {task.project && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${task.project.color}20`,
                color: task.project.color,
              }}
            >
              {task.project.name}
            </span>
          )}
          <PriorityBadge priority={task.priority} />
        </div>
      </div>

      {task.assignedTo.length > 0 && (
        <div className="flex -space-x-2">
          {task.assignedTo.slice(0, 3).map((user) => (
            <UserAvatar
              key={user._id}
              name={user.firstName || user.username}
              src={user.avatar}
              size="sm"
              className="border-2 border-background"
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

// Project Card Component
interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  return (
    <Link to={`/projects/${project._id}`}>
      <Card hoverable className="h-full">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: project.color }}
            >
              <FontAwesomeIcon icon={faFolderOpen} className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{project.name}</p>
              <p className="text-xs text-muted-foreground">
                {project.members.length} member{project.members.length !== 1 ? "s" : ""}
              </p>
            </div>
            <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { openModal } = useUIStore();

  // Fetch data
  const { data: todayTasks, isLoading: todayLoading } = useTasks({
    dueDate: dayjs().format("YYYY-MM-DD"),
    completed: false,
    limit: 10,
  });

  const { data: allTasks } = useTasks({
    limit: 100,
  });

  const { data: projects, isLoading: projectsLoading } = useProjects();

  // Calculate stats
  const totalTasks = allTasks?.pagination.total || 0;
  const completedTasks = allTasks?.tasks.filter((t) => t.completed).length || 0;
  const pendingTasks = totalTasks - completedTasks;
  const todayCount = todayTasks?.tasks.length || 0;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {greeting()}, {user?.firstName || user?.username || "there"}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your tasks today.
          </p>
        </div>
        <Button onClick={() => openModal("task")}>
          <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tasks"
          value={totalTasks}
          icon={<FontAwesomeIcon icon={faListCheck} className="w-6 h-6" />}
          color="#6366F1"
        />
        <StatCard
          title="Completed"
          value={completedTasks}
          icon={<FontAwesomeIcon icon={faCheck} className="w-6 h-6" />}
          color="#22C55E"
        />
        <StatCard
          title="Pending"
          value={pendingTasks}
          icon={<FontAwesomeIcon icon={faClock} className="w-6 h-6" />}
          color="#F59E0B"
        />
        <StatCard
          title="Due Today"
          value={todayCount}
          icon={<FontAwesomeIcon icon={faCalendarDay} className="w-6 h-6" />}
          color="#EF4444"
          to="/today"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FontAwesomeIcon icon={faCalendarDay} className="w-5 h-5 text-primary" />
                Today's Tasks
              </CardTitle>
              <Link to="/today">
                <Button variant="ghost" size="sm">
                  View all
                  <FontAwesomeIcon icon={faChevronRight} className="ml-1 w-3 h-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {todayLoading ? (
                <div className="space-y-3">
                  <SkeletonTaskCard />
                  <SkeletonTaskCard />
                  <SkeletonTaskCard />
                </div>
              ) : todayTasks?.tasks && todayTasks.tasks.length > 0 ? (
                <div className="space-y-2">
                  {todayTasks.tasks.map((task) => (
                    <TaskItem key={task._id} task={task} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={faCalendarDay}
                  title="No tasks due today"
                  description="You're all caught up! Add a new task to get started."
                  action={{
                    label: "Add Task",
                    onClick: () => openModal("task"),
                  }}
                  className="py-8"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects */}
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FontAwesomeIcon icon={faFolderOpen} className="w-5 h-5 text-secondary" />
                Projects
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => openModal("project")}>
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : projects && projects.length > 0 ? (
                <div className="space-y-3">
                  {projects.slice(0, 5).map((project) => (
                    <ProjectCard key={project._id} project={project} />
                  ))}
                  {projects.length > 5 && (
                    <Link
                      to="/projects"
                      className="block text-center text-sm text-primary hover:underline py-2"
                    >
                      View all {projects.length} projects
                    </Link>
                  )}
                </div>
              ) : (
                <EmptyState
                  icon={faFolderOpen}
                  title="No projects yet"
                  description="Create your first project to organize your tasks."
                  action={{
                    label: "Create Project",
                    onClick: () => openModal("project"),
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

export default DashboardPage;
