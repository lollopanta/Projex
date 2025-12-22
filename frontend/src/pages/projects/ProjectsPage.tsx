/**
 * ============================================
 * PROJECTS PAGE
 * View all projects
 * ============================================
 */

import React from "react";
import { Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFolderOpen,
  faPlus,
  faUsers,
  faListCheck,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/hooks/useProjects";
import { useUIStore } from "@/store";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

export const ProjectsPage: React.FC = () => {
  const { openModal } = useUIStore();
  const { data: projects, isLoading } = useProjects();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FontAwesomeIcon icon={faFolderOpen} className="w-8 h-8 text-primary" />
            Projects
          </h1>
          <p className="text-muted-foreground mt-1">
            Organize your work into projects
          </p>
        </div>
        <Button onClick={() => openModal("project")}>
          <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project: Project) => (
            <Link key={project._id} to={`/projects/${project._id}`}>
              <div className="h-full transition-transform hover:scale-[1.02]">
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: project.color }}
                      >
                        <FontAwesomeIcon icon={faFolderOpen} className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FontAwesomeIcon icon={faUsers} className="w-4 h-4" />
                            {project.members.length + 1}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={faFolderOpen}
              title="No projects yet"
              description="Create your first project to organize your tasks and collaborate with your team."
              action={{
                label: "Create Project",
                onClick: () => openModal("project"),
              }}
              className="py-12"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProjectsPage;
