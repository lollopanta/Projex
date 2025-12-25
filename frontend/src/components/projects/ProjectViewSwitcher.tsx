/**
 * ============================================
 * PROJECT VIEW SWITCHER
 * Switch between List, Table, Kanban, Gantt views
 * ============================================
 */

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faList,
  faTable,
  faColumns,
  faChartGantt,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ProjectViewType = "list" | "table" | "kanban" | "gantt";

interface ProjectViewSwitcherProps {
  currentView: ProjectViewType;
  onViewChange: (view: ProjectViewType) => void;
  className?: string;
}

const views: { id: ProjectViewType; label: string; icon: typeof faList }[] = [
  { id: "list", label: "List", icon: faList },
  { id: "table", label: "Table", icon: faTable },
  { id: "kanban", label: "Kanban", icon: faColumns },
  { id: "gantt", label: "Gantt", icon: faChartGantt },
];

export const ProjectViewSwitcher: React.FC<ProjectViewSwitcherProps> = ({
  currentView,
  onViewChange,
  className,
}) => {
  return (
    <div className={cn("flex items-center gap-1 p-1 rounded-lg border bg-muted/50", className)}>
      {views.map((view) => (
        <Button
          key={view.id}
          variant={currentView === view.id ? "default" : "ghost"}
          size="sm"
          onClick={() => onViewChange(view.id)}
          className="gap-2"
        >
          <FontAwesomeIcon icon={view.icon} className="w-4 h-4" />
          <span className="hidden sm:inline">{view.label}</span>
        </Button>
      ))}
    </div>
  );
};
