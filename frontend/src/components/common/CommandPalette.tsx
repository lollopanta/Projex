/**
 * ============================================
 * COMMAND PALETTE COMPONENT
 * Global search and quick actions (Ctrl+K)
 * ============================================
 */

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faFolderOpen,
  faListCheck,
  faTags,
  faCheck,
  faPlus,
  faHome,
  faGear,
} from "@fortawesome/free-solid-svg-icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store";
import { useProjects, useLists, useTasks, useLabels } from "@/hooks";

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
  keywords?: string[];
}

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const { commandPaletteOpen, setCommandPaletteOpen, openModal } = useUIStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fetch data
  const { data: projects } = useProjects();
  const { data: lists } = useLists();
  const { data: tasksData } = useTasks({ limit: 10 });
  const { data: labels } = useLabels();

  const tasks = tasksData?.tasks || [];

  // Build command items
  const items = useMemo<CommandItem[]>(() => {
    const commands: CommandItem[] = [
      // Quick Actions
      {
        id: "new-task",
        label: "Create new task",
        icon: <FontAwesomeIcon icon={faPlus} />,
        action: () => {
          setCommandPaletteOpen(false);
          openModal("task");
        },
        category: "Actions",
        keywords: ["add", "create", "new", "task"],
      },
      {
        id: "new-project",
        label: "Create new project",
        icon: <FontAwesomeIcon icon={faPlus} />,
        action: () => {
          setCommandPaletteOpen(false);
          openModal("project");
        },
        category: "Actions",
        keywords: ["add", "create", "new", "project"],
      },
      {
        id: "new-list",
        label: "Create new list",
        icon: <FontAwesomeIcon icon={faPlus} />,
        action: () => {
          setCommandPaletteOpen(false);
          openModal("list");
        },
        category: "Actions",
        keywords: ["add", "create", "new", "list"],
      },

      // Navigation
      {
        id: "nav-home",
        label: "Go to Dashboard",
        icon: <FontAwesomeIcon icon={faHome} />,
        action: () => {
          setCommandPaletteOpen(false);
          navigate("/");
        },
        category: "Navigation",
        keywords: ["dashboard", "home"],
      },
      {
        id: "nav-settings",
        label: "Go to Settings",
        icon: <FontAwesomeIcon icon={faGear} />,
        action: () => {
          setCommandPaletteOpen(false);
          navigate("/settings");
        },
        category: "Navigation",
        keywords: ["settings", "preferences"],
      },

      // Projects
      ...(projects || []).map((project) => ({
        id: `project-${project._id}`,
        label: project.name,
        icon: <FontAwesomeIcon icon={faFolderOpen} style={{ color: project.color }} />,
        action: () => {
          setCommandPaletteOpen(false);
          navigate(`/projects/${project._id}`);
        },
        category: "Projects",
        keywords: [project.name.toLowerCase(), "project"],
      })),

      // Lists
      ...(lists || []).map((list) => ({
        id: `list-${list._id}`,
        label: list.name,
        icon: <FontAwesomeIcon icon={faListCheck} style={{ color: list.color }} />,
        action: () => {
          setCommandPaletteOpen(false);
          navigate(`/lists/${list._id}`);
        },
        category: "Lists",
        keywords: [list.name.toLowerCase(), "list"],
      })),

      // Labels
      ...(labels || []).map((label) => ({
        id: `label-${label._id}`,
        label: label.name,
        icon: <FontAwesomeIcon icon={faTags} style={{ color: label.color }} />,
        action: () => {
          setCommandPaletteOpen(false);
          navigate(`/labels?id=${label._id}`);
        },
        category: "Labels",
        keywords: [label.name.toLowerCase(), "label", "tag"],
      })),

      // Tasks
      ...tasks.slice(0, 5).map((task) => ({
        id: `task-${task._id}`,
        label: task.title,
        icon: <FontAwesomeIcon icon={task.completed ? faCheck : faListCheck} />,
        action: () => {
          setCommandPaletteOpen(false);
          openModal("taskDetail", task);
        },
        category: "Tasks",
        keywords: [task.title.toLowerCase(), "task"],
      })),
    ];

    return commands;
  }, [projects, lists, labels, tasks, navigate, openModal, setCommandPaletteOpen]);

  // Filter items by query
  const filteredItems = useMemo(() => {
    if (!query) return items;
    const lowerQuery = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(lowerQuery) ||
        item.keywords?.some((kw) => kw.includes(lowerQuery))
    );
  }, [items, query]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredItems.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  // Keyboard navigation
  useEffect(() => {
    if (!commandPaletteOpen) {
      setQuery("");
      setSelectedIndex(0);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredItems.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredItems.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            filteredItems[selectedIndex].action();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, filteredItems, selectedIndex]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  let flatIndex = 0;

  return (
    <Dialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <DialogContent 
        className="max-w-2xl p-0 gap-0 overflow-hidden" 
        showClose={false}
        aria-describedby="command-palette-description"
      >
        <DialogDescription id="command-palette-description" className="sr-only">
          Search and navigate through projects, tasks, lists, and labels
        </DialogDescription>
        {/* Search Input */}
        <div className="flex items-center border-b px-4">
          <FontAwesomeIcon icon={faSearch} className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search or type a command..."
            className="flex-1 h-14 px-4 bg-transparent border-0 outline-none text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No results found</p>
          ) : (
            Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category} className="mb-4">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
                  {category}
                </p>
                {categoryItems.map((item) => {
                  const currentIndex = flatIndex++;
                  const isSelected = currentIndex === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors",
                        isSelected
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      <span className="w-5 h-5 flex items-center justify-center text-muted-foreground">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted">↑</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-muted">↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted">esc</kbd>
            close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;
