/**
 * ============================================
 * SIDEBAR COMPONENT
 * Main navigation sidebar with projects & lists
 * ============================================
 */

import React from "react";
import { NavLink } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faFolderOpen,
  faListCheck,
  faGear,
  faChevronDown,
  faChevronRight,
  faPlus,
  faInbox,
  faCalendarDay,
  faCalendarWeek,
} from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store";
import { useProjects, useLists, useLabels } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project, List, Label } from "@/types";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  color?: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, badge, color }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          "hover:bg-accent/50",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground"
        )
      }
    >
      <span className="w-5 h-5 flex items-center justify-center" style={{ color }}>
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{badge}</span>
      )}
    </NavLink>
  );
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  onAdd?: () => void;
}

const Section: React.FC<SectionProps> = ({
  title,
  children,
  defaultOpen = true,
  onAdd,
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        >
          <FontAwesomeIcon
            icon={isOpen ? faChevronDown : faChevronRight}
            className="w-3 h-3"
          />
          {title}
        </button>
        {onAdd && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6"
            onClick={onAdd}
          >
            <FontAwesomeIcon icon={faPlus} className="w-3 h-3" />
          </Button>
        )}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const { sidebarOpen, sidebarCollapsed, openModal } = useUIStore();

  // Fetch data
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: lists, isLoading: listsLoading } = useLists();
  const { data: labels, isLoading: labelsLoading } = useLabels();

  // Filter lists without projects (personal lists)
  const personalLists = lists?.filter((l) => !l.project) || [];

  if (!sidebarOpen) return null;

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      exit={{ x: -280 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "fixed left-0 top-0 h-screen bg-card border-r z-40 flex flex-col",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b">
        <NavLink to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          {!sidebarCollapsed && (
            <span className="font-bold text-xl gradient-text">Projex</span>
          )}
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* Main Navigation */}
        <div className="space-y-1">
          <NavItem
            to="/"
            icon={<FontAwesomeIcon icon={faHome} />}
            label="Dashboard"
          />
          <NavItem
            to="/inbox"
            icon={<FontAwesomeIcon icon={faInbox} />}
            label="Inbox"
          />
          <NavItem
            to="/today"
            icon={<FontAwesomeIcon icon={faCalendarDay} />}
            label="Today"
          />
          <NavItem
            to="/upcoming"
            icon={<FontAwesomeIcon icon={faCalendarWeek} />}
            label="Upcoming"
          />
        </div>

        {/* Projects Section */}
        <Section
          title="Projects"
          onAdd={() => openModal("project")}
        >
          {projectsLoading ? (
            <div className="space-y-2 px-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="space-y-1">
              {projects.map((project: Project) => (
                <NavItem
                  key={project._id}
                  to={`/projects/${project._id}`}
                  icon={<FontAwesomeIcon icon={faFolderOpen} />}
                  label={project.name}
                  color={project.color}
                />
              ))}
            </div>
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No projects yet
            </p>
          )}
        </Section>

        {/* Lists Section */}
        <Section
          title="Lists"
          onAdd={() => openModal("list")}
        >
          {listsLoading ? (
            <div className="space-y-2 px-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : personalLists.length > 0 ? (
            <div className="space-y-1">
              {personalLists.map((list: List) => (
                <NavItem
                  key={list._id}
                  to={`/lists/${list._id}`}
                  icon={<FontAwesomeIcon icon={faListCheck} />}
                  label={list.name}
                  color={list.color}
                />
              ))}
            </div>
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No lists yet
            </p>
          )}
        </Section>

        {/* Labels Section */}
        <Section title="Labels" onAdd={() => openModal("label")}>
          {labelsLoading ? (
            <div className="space-y-2 px-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : labels && labels.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 px-3">
              {labels.slice(0, 8).map((label: Label) => (
                <NavLink
                  key={label._id}
                  to={`/labels?id=${label._id}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white transition-opacity hover:opacity-80"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </NavLink>
              ))}
              {labels.length > 8 && (
                <NavLink
                  to="/labels"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  +{labels.length - 8} more
                </NavLink>
              )}
            </div>
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No labels yet
            </p>
          )}
        </Section>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t space-y-1">
        <NavItem
          to="/settings"
          icon={<FontAwesomeIcon icon={faGear} />}
          label="Settings"
        />
      </div>
    </motion.aside>
  );
};

export default Sidebar;
