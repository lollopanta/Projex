/**
 * ============================================
 * ADMIN SETTINGS PANEL
 * Admin-only settings management
 * ============================================
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faPalette,
  faGauge,
  faWrench,
  faExclamationTriangle,
  faSave,
} from "@fortawesome/free-solid-svg-icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSiteSettings, useUpdateSiteSettings, useAdminStats } from "@/hooks";
import { useAuthStore } from "@/store";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { SiteSettings } from "@/types";

export const AdminSettingsPanel: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  
  const { data: settings, isLoading: settingsLoading, error: settingsError } = useSiteSettings({
    enabled: isAdmin,
  });
  const { data: stats } = useAdminStats({
    enabled: isAdmin,
  });
  const updateSettings = useUpdateSiteSettings();

  const [localSettings, setLocalSettings] = useState(settings);

  // Update local state when settings load
  React.useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleToggle = (field: keyof SiteSettings) => {
    if (!localSettings) return;
    setLocalSettings({
      ...localSettings,
      [field]: !(localSettings[field] as boolean),
    });
  };

  const handleChange = (field: keyof SiteSettings, value: unknown) => {
    if (!localSettings) return;
    setLocalSettings({
      ...localSettings,
      [field]: value,
    });
  };

  const handleSave = () => {
    if (!localSettings || !settings) return;
    // Only send changed fields
    const changes: Partial<SiteSettings> = {};
    Object.keys(localSettings).forEach((key) => {
      const k = key as keyof SiteSettings;
      if (localSettings[k] !== settings[k]) {
        changes[k] = localSettings[k];
      }
    });
    updateSettings.mutate(changes);
  };

  const hasChanges = localSettings && settings 
    ? JSON.stringify(localSettings) !== JSON.stringify(settings)
    : false;

  // Don't show anything if not admin
  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            You don&apos;t have permission to access admin settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (settingsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (settingsError || !settings) {
    const errorMessage = (settingsError as Error & { status?: number })?.status === 403
      ? "You don't have permission to access admin settings."
      : "Failed to load settings. Please try again later.";
    
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">{errorMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      {localSettings.maintenanceMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
        >
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            <p className="font-medium">Maintenance mode is active</p>
          </div>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            {localSettings.maintenanceMessage}
          </p>
        </motion.div>
      )}

      {/* Stats Card */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.users.total}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold">{stats.users.verified}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold">{stats.users.admins}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">With 2FA</p>
                <p className="text-2xl font-bold">{stats.users.with2FA}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faEnvelope} />
            Email Configuration
          </CardTitle>
          <CardDescription>Configure email sending and verification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Email Sending</Label>
              <p className="text-sm text-muted-foreground">
                Allow the system to send emails
              </p>
            </div>
            <Checkbox
              checked={localSettings.allowEmailSending}
              onCheckedChange={() => handleToggle("allowEmailSending")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Email Verification</Label>
              <p className="text-sm text-muted-foreground">
                New users must verify their email before logging in
              </p>
            </div>
            <Checkbox
              checked={localSettings.requireEmailVerification}
              onCheckedChange={() => handleToggle("requireEmailVerification")}
              disabled={!localSettings.allowEmailSending}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Email 2FA</Label>
              <p className="text-sm text-muted-foreground">
                Allow users to use email-based two-factor authentication
              </p>
            </div>
            <Checkbox
              checked={localSettings.allowEmail2FA}
              onCheckedChange={() => handleToggle("allowEmail2FA")}
              disabled={!localSettings.allowEmailSending}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable TOTP 2FA</Label>
              <p className="text-sm text-muted-foreground">
                Allow users to use authenticator app-based 2FA
              </p>
            </div>
            <Checkbox
              checked={localSettings.allowTOTP2FA}
              onCheckedChange={() => handleToggle("allowTOTP2FA")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Application Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faPalette} />
            Application Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Theme</Label>
            <Select
              value={localSettings.defaultTheme || "light"}
              onValueChange={(value) => handleChange("defaultTheme", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Registration</Label>
              <p className="text-sm text-muted-foreground">
                Allow new users to create accounts
              </p>
            </div>
            <Checkbox
              checked={localSettings.registrationEnabled}
              onCheckedChange={() => handleToggle("registrationEnabled")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Resource Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faGauge} />
            Resource Limits
          </CardTitle>
          <CardDescription>Set limits to prevent resource abuse</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="max-projects">Max Projects Per User</Label>
            <Input
              id="max-projects"
              type="number"
              min="1"
              placeholder="Unlimited"
              value={localSettings.maxProjectsPerUser || ""}
              onChange={(e) =>
                handleChange(
                  "maxProjectsPerUser",
                  e.target.value === "" ? null : parseInt(e.target.value)
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for unlimited
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-tasks">Max Tasks Per Project</Label>
            <Input
              id="max-tasks"
              type="number"
              min="1"
              placeholder="Unlimited"
              value={localSettings.maxTasksPerProject || ""}
              onChange={(e) =>
                handleChange(
                  "maxTasksPerProject",
                  e.target.value === "" ? null : parseInt(e.target.value)
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for unlimited
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faWrench} />
            Maintenance Mode
          </CardTitle>
          <CardDescription>
            Temporarily disable the application for maintenance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                Block all non-admin access to the application
              </p>
            </div>
            <Checkbox
              checked={localSettings.maintenanceMode}
              onCheckedChange={() => handleToggle("maintenanceMode")}
            />
          </div>

          {localSettings.maintenanceMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-2"
            >
              <Label htmlFor="maintenance-message">Maintenance Message</Label>
              <textarea
                id="maintenance-message"
                rows={3}
                className={cn(
                  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                  "placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
                placeholder="Enter maintenance message..."
                value={localSettings.maintenanceMessage}
                onChange={(e) => handleChange("maintenanceMessage", e.target.value)}
                maxLength={500}
              />
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateSettings.isPending}
          loading={updateSettings.isPending}
          className="gap-2"
        >
          <FontAwesomeIcon icon={faSave} />
          Save Changes
        </Button>
      </div>
    </div>
  );
};
