/**
 * ============================================
 * TASK DEPENDENCY GRAPH
 * Visual representation of task dependencies
 * ============================================
 */

import React, { useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLink,
  faCheck,
  faExclamationTriangle,
  faArrowRight,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, PriorityBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTaskDependencies, useRemoveTaskDependency, useTaskImpact } from "@/hooks/useTasks";
import { useUIStore } from "@/store";
import type { TaskPopulated } from "@/types";

interface TaskDependencyGraphProps {
  taskId: string;
}

interface GraphNode {
  task: TaskPopulated;
  x: number;
  y: number;
  depth: number;
  isBlocked: boolean;
}

interface GraphEdge {
  from: string;
  to: string;
}

export const TaskDependencyGraph: React.FC<TaskDependencyGraphProps> = ({ taskId }) => {
  const { data: graphData, isLoading, error } = useTaskDependencies(taskId);
  const { data: impactData } = useTaskImpact(taskId);
  const { openModal } = useUIStore();
  const removeDependency = useRemoveTaskDependency();
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Build graph nodes and edges
  const { nodes, edges } = useMemo(() => {
    if (!graphData) return { nodes: [], edges: [] };

    const nodeMap = new Map<string, GraphNode>();
    const edgeList: GraphEdge[] = [];

    // Add center task
    const centerTask = graphData.task;
    nodeMap.set(centerTask._id, {
      task: centerTask,
      x: 0,
      y: 0,
      depth: 0,
      isBlocked: graphData.isBlocked,
    });

    // Add upstream nodes (dependencies) - positioned above center
    if (graphData.upstream.length > 0) {
      graphData.upstream.forEach((node, index) => {
        const totalUpstream = graphData.upstream.length;
        // Distribute evenly in an arc above
        const angle = Math.PI + (index / (totalUpstream - 1 || 1)) * Math.PI;
        const radius = 180 + node.depth * 120;
        nodeMap.set(node.task._id, {
          task: node.task,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius - 50, // Shift up
          depth: -node.depth - 1,
          isBlocked: !node.task.completed,
        });
        edgeList.push({
          from: node.task._id,
          to: centerTask._id,
        });
      });
    }

    // Add downstream nodes (dependents) - positioned below center
    if (graphData.downstream.length > 0) {
      graphData.downstream.forEach((node, index) => {
        const totalDownstream = graphData.downstream.length;
        // Distribute evenly in an arc below
        const angle = (index / (totalDownstream - 1 || 1)) * Math.PI;
        const radius = 180 + node.depth * 120;
        nodeMap.set(node.task._id, {
          task: node.task,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius + 50, // Shift down
          depth: node.depth + 1,
          isBlocked: false, // Will be computed
        });
        edgeList.push({
          from: centerTask._id,
          to: node.task._id,
        });
      });
    }

    return {
      nodes: Array.from(nodeMap.values()),
      edges: edgeList,
    };
  }, [graphData]);

  // Calculate SVG viewBox - centered on origin with padding
  const viewBox = useMemo(() => {
    if (nodes.length === 0) return "-400 -300 800 600";

    const padding = 120;
    const minX = Math.min(...nodes.map(n => n.x)) - padding;
    const maxX = Math.max(...nodes.map(n => n.x)) + padding;
    const minY = Math.min(...nodes.map(n => n.y)) - padding;
    const maxY = Math.max(...nodes.map(n => n.y)) + padding;

    const width = maxX - minX;
    const height = maxY - minY;

    return `${minX} ${minY} ${width} ${height}`;
  }, [nodes]);

  const handleNodeClick = (taskId: string) => {
    setSelectedTaskId(taskId === selectedTaskId ? null : taskId);
    openModal("taskDetail", { _id: taskId });
  };

  const handleRemoveDependency = (e: React.MouseEvent, dependencyId: string) => {
    e.stopPropagation();
    if (window.confirm("Remove this dependency?")) {
      removeDependency.mutate({ taskId, dependencyId });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading dependency graph...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-destructive">Failed to load dependency graph</div>
        </CardContent>
      </Card>
    );
  }

  if (!graphData) {
    return null;
  }

  const centerTask = graphData.task;
  const hasDependencies = graphData.upstream.length > 0 || graphData.downstream.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FontAwesomeIcon icon={faLink} className="w-5 h-5" />
          Dependency Graph
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Ready (all dependencies completed)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Blocked (has incomplete dependencies)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Completed</span>
          </div>
        </div>

        {/* Graph Visualization */}
        {hasDependencies ? (
          <div className="border rounded-lg bg-muted/20 p-4 overflow-auto">
            <svg
              viewBox={viewBox}
              className="w-full h-[600px] min-h-[400px]"
              style={{ minHeight: "400px" }}
            >
              {/* Edges */}
              <g className="edges">
                {edges.map((edge, index) => {
                  const fromNode = nodes.find(n => n.task._id === edge.from);
                  const toNode = nodes.find(n => n.task._id === edge.to);

                  if (!fromNode || !toNode) return null;

                  const isHighlighted =
                    hoveredTaskId === edge.from ||
                    hoveredTaskId === edge.to ||
                    selectedTaskId === edge.from ||
                    selectedTaskId === edge.to;

                  return (
                    <line
                      key={`${edge.from}-${edge.to}-${index}`}
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke={isHighlighted ? "#6366F1" : "#94a3b8"}
                      strokeWidth={isHighlighted ? 2 : 1}
                      strokeDasharray={fromNode.depth > 0 ? "5,5" : "0"}
                      markerEnd="url(#arrowhead)"
                      className="transition-all"
                    />
                  );
                })}
              </g>

              {/* Arrow marker definition */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3, 0 6" fill="#94a3b8" />
                </marker>
              </defs>

              {/* Nodes */}
              <g className="nodes">
                {nodes.map((node) => {
                  const isCenter = node.task._id === centerTask._id;
                  const isHovered = hoveredTaskId === node.task._id;
                  const isSelected = selectedTaskId === node.task._id;
                  const isBlocked = node.isBlocked && !node.task.completed;
                  const isCompleted = node.task.completed;

                  // Node color based on state
                  let nodeColor = "#3b82f6"; // Blue (ready)
                  if (isCompleted) {
                    nodeColor = "#22c55e"; // Green (completed)
                  } else if (isBlocked) {
                    nodeColor = "#ef4444"; // Red (blocked)
                  }

                  return (
                    <g
                      key={node.task._id}
                      transform={`translate(${node.x}, ${node.y})`}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredTaskId(node.task._id)}
                      onMouseLeave={() => setHoveredTaskId(null)}
                      onClick={() => handleNodeClick(node.task._id)}
                    >
                      {/* Node circle */}
                      <circle
                        r={isCenter ? 35 : 25}
                        fill={nodeColor}
                        stroke={isHovered || isSelected ? "#6366F1" : "#fff"}
                        strokeWidth={isHovered || isSelected ? 3 : 2}
                        className="transition-all"
                        opacity={isHovered || isSelected ? 1 : 0.9}
                      />

                      {/* Task title (truncated) */}
                      <text
                        x="0"
                        y={isCenter ? 50 : 40}
                        textAnchor="middle"
                        className="text-xs font-medium fill-foreground pointer-events-none"
                        style={{ fontSize: isCenter ? "11px" : "9px" }}
                      >
                        {node.task.title.length > (isCenter ? 15 : 12)
                          ? `${node.task.title.slice(0, isCenter ? 15 : 12)}...`
                          : node.task.title}
                      </text>

                      {/* Completion indicator */}
                      {isCompleted && (
                        <text
                          x="0"
                          y="-5"
                          textAnchor="middle"
                          className="text-white fill-white pointer-events-none"
                          style={{ fontSize: "14px" }}
                        >
                          ✓
                        </text>
                      )}

                      {/* Blocked indicator */}
                      {isBlocked && !isCompleted && (
                        <text
                          x="0"
                          y="-5"
                          textAnchor="middle"
                          className="text-white fill-white pointer-events-none"
                          style={{ fontSize: "12px" }}
                        >
                          ⚠
                        </text>
                      )}

                      {/* Depth indicator for upstream/downstream */}
                      {!isCenter && (
                        <text
                          x={node.depth < 0 ? "-35" : "35"}
                          y="0"
                          textAnchor="middle"
                          className="text-xs fill-muted-foreground pointer-events-none"
                        >
                          {node.depth < 0 ? `D${Math.abs(node.depth)}` : `L${node.depth}`}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FontAwesomeIcon icon={faLink} className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-sm">No dependencies</p>
            <p className="text-xs mt-1">This task has no dependencies or dependents</p>
          </div>
        )}

        {/* Task Details */}
        <div className="space-y-3">
          {/* Center Task Info */}
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">{centerTask.title}</h4>
                  {graphData.isBlocked && (
                    <Badge variant="destructive" className="text-xs">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3 mr-1" />
                      Blocked
                    </Badge>
                  )}
                  {centerTask.completed && (
                    <Badge variant="success" className="text-xs">
                      <FontAwesomeIcon icon={faCheck} className="w-3 h-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>
                {graphData.isBlocked && (
                  <p className="text-xs text-muted-foreground mb-2">
                    This task is blocked by incomplete dependencies
                  </p>
                )}
                {/* Impact Analysis */}
                {impactData && impactData.total > 0 && (
                  <div className="mt-2 p-2 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                    <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-1">
                      Impact Analysis
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      If this task is delayed, <strong>{impactData.total}</strong> task{impactData.total !== 1 ? "s are" : " is"} affected:
                    </p>
                    <ul className="text-xs text-amber-800 dark:text-amber-200 mt-1 ml-4 list-disc">
                      <li><strong>{impactData.direct}</strong> directly blocked</li>
                      <li><strong>{impactData.indirect}</strong> indirectly affected</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dependencies List */}
          {graphData.upstream.length > 0 && (
            <div>
              <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3 rotate-180" />
                Dependencies ({graphData.upstream.length})
              </h5>
              <div className="space-y-2">
                {graphData.upstream.map((node) => (
                  <div
                    key={node.task._id}
                    className={cn(
                      "p-2 rounded border flex items-center justify-between",
                      node.task.completed
                        ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                        : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                    )}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {node.task.completed ? (
                        <FontAwesomeIcon
                          icon={faCheck}
                          className="w-4 h-4 text-green-600 dark:text-green-400"
                        />
                      ) : (
                        <FontAwesomeIcon
                          icon={faExclamationTriangle}
                          className="w-4 h-4 text-red-600 dark:text-red-400"
                        />
                      )}
                      <span className="text-sm font-medium">{node.task.title}</span>
                      <PriorityBadge priority={node.task.priority} />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleRemoveDependency(e, node.task._id)}
                      className="h-6 px-2"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dependents List */}
          {graphData.downstream.length > 0 && (
            <div>
              <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
                Blocks ({graphData.downstream.length} task{graphData.downstream.length !== 1 ? "s" : ""})
              </h5>
              <div className="space-y-2">
                {graphData.downstream.map((node) => (
                  <div
                    key={node.task._id}
                    className="p-2 rounded border bg-muted/50 flex items-center gap-2 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleNodeClick(node.task._id)}
                  >
                    <span className="text-sm flex-1">{node.task.title}</span>
                    <PriorityBadge priority={node.task.priority} />
                    {node.task.completed && (
                      <FontAwesomeIcon
                        icon={faCheck}
                        className="w-4 h-4 text-green-600 dark:text-green-400"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
            <FontAwesomeIcon
              icon={faInfoCircle}
              className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5"
            />
            <div className="text-xs text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">How dependencies work:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Dependencies are tasks that must be completed before this task</li>
                <li>Blocked tasks are highlighted in red</li>
                <li>Click on any task to view its details</li>
                <li>Circular dependencies are automatically prevented</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
