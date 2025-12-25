/**
 * ============================================
 * BACKUP PAGE
 * Export and import user data
 * ============================================
 */

import React, { useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDownload,
  faUpload,
  faFileArrowDown,
  faFileArrowUp,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/store";
import { backupApi } from "@/api";

export const BackupPage: React.FC = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await backupApi.downloadBackup();
      toast.success("Backup exported", "Your data has been downloaded successfully");
    } catch (error) {
      const err = error as Error;
      toast.error("Export failed", err.message || "Could not export backup");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      // Validate backup structure
      if (!backupData.data || typeof backupData.data !== "object") {
        throw new Error("Invalid backup file format");
      }

      await backupApi.importBackup({ data: backupData.data });
      toast.success("Backup imported", "Your data has been imported successfully");
      
      // Reload page to refresh data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      const err = error as Error;
      toast.error("Import failed", err.message || "Could not import backup");
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Backup & Restore</h1>
        <p className="text-muted-foreground mt-1">
          Export your data for safekeeping or import from a previous backup
        </p>
      </div>

      {/* Warning */}
      <div className="p-4 rounded-lg border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
        <div className="flex items-start gap-3">
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0"
          />
          <div>
            <p className="font-semibold text-yellow-900 dark:text-yellow-100">
              Important: Backup Safety
            </p>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
              Importing a backup will replace all your current data. Make sure to export a backup
              before importing if you want to keep your current data.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faDownload} className="w-5 h-5" />
              Export Data
            </CardTitle>
            <CardDescription>
              Download all your tasks, projects, lists, labels, and comments as a JSON file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your backup will include:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>All tasks and subtasks</li>
              <li>All projects and their members</li>
              <li>All lists and their members</li>
              <li>All labels</li>
              <li>All comments</li>
            </ul>
            <Button
              onClick={handleExport}
              loading={isExporting}
              className="w-full"
              disabled={isExporting}
            >
              <FontAwesomeIcon icon={faFileArrowDown} className="mr-2 h-4 w-4" />
              Export Backup
            </Button>
          </CardContent>
        </Card>

        {/* Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faUpload} className="w-5 h-5" />
              Import Data
            </CardTitle>
            <CardDescription>
              Restore your data from a previously exported backup file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a backup file to import. This will replace all your current data.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="backup-file-input"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full"
              disabled={isImporting}
              loading={isImporting}
            >
              <FontAwesomeIcon icon={faFileArrowUp} className="mr-2 h-4 w-4" />
              Choose Backup File
            </Button>
            {isImporting && (
              <p className="text-sm text-muted-foreground text-center">
                Importing backup...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BackupPage;
