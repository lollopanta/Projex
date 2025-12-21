/**
 * ============================================
 * TOPBAR COMPONENT
 * Main header with search, quick add, and profile
 * ============================================
 */

import React from "react";
import { useNavigate } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faSearch,
  faPlus,
  faMoon,
  faSun,
  faBell,
  faUser,
  faGear,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import { useAuthStore, useUIStore } from "@/store";
import { useLogout } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Topbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, setTheme } = useAuthStore();
  const { toggleSidebar, openModal, setCommandPaletteOpen } = useUIStore();
  const logout = useLogout();

  const isDarkMode = user?.theme === "dark";

  const handleToggleTheme = () => {
    setTheme(isDarkMode ? "light" : "dark");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Keyboard shortcut for search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setCommandPaletteOpen]);

  return (
    <header className="sticky top-0 z-30 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-4 gap-4">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="lg:hidden"
          >
            <FontAwesomeIcon icon={faBars} className="h-5 w-5" />
          </Button>

          {/* Search */}
          <div className="hidden sm:block relative w-64 lg:w-96">
            <Input
              type="text"
              placeholder="Search... (⌘K)"
              className="pl-10 bg-muted/50"
              onClick={() => setCommandPaletteOpen(true)}
              readOnly
            />
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            />
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Quick Add Button */}
          <Button
            onClick={() => openModal("task")}
            className="hidden sm:flex gap-2"
          >
            <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
            <span>New Task</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openModal("task")}
            className="sm:hidden"
          >
            <FontAwesomeIcon icon={faPlus} className="h-5 w-5" />
          </Button>

          {/* Theme Toggle */}
          <Button variant="ghost" size="icon" onClick={handleToggleTheme}>
            <FontAwesomeIcon
              icon={isDarkMode ? faSun : faMoon}
              className="h-5 w-5"
            />
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon">
            <FontAwesomeIcon icon={faBell} className="h-5 w-5" />
          </Button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <UserAvatar
                  name={user?.firstName || user?.username || "User"}
                  src={user?.avatar}
                  size="sm"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">
                    {user?.firstName
                      ? `${user.firstName} ${user.lastName || ""}`
                      : user?.username}
                  </p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <FontAwesomeIcon icon={faUser} className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <FontAwesomeIcon icon={faGear} className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <FontAwesomeIcon
                  icon={faRightFromBracket}
                  className="mr-2 h-4 w-4"
                />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
