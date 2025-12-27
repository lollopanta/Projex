/**
 * ============================================
 * SMART ENGINE PAGE
 * Main page integrating Smart Engine features
 * ============================================
 */

import React, { useState } from "react";
import { useParams } from "react-router";
import { SmartTaskList } from "@/components/smartEngine/SmartTaskList";
import { SmartDashboard } from "@/components/smartEngine/SmartDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine, faList } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

type ViewMode = "dashboard" | "list";

export const SmartEnginePage: React.FC = () => {
  const { projectId } = useParams<{ projectId?: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Smart Engine</h1>
          <p className="text-muted-foreground mt-1">
            Intelligent task prioritization and workload analysis
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "dashboard" ? "default" : "outline"}
            onClick={() => setViewMode("dashboard")}
          >
            <FontAwesomeIcon icon={faChartLine} className="mr-2 w-4 h-4" />
            Dashboard
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            onClick={() => setViewMode("list")}
          >
            <FontAwesomeIcon icon={faList} className="mr-2 w-4 h-4" />
            Task List
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "dashboard" ? (
        <SmartDashboard projectId={projectId} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <SmartTaskList projectId={projectId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
