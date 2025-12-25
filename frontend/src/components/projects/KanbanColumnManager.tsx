/**
 * ============================================
 * KANBAN COLUMN MANAGER
 * Component for creating, editing, and deleting Kanban columns
 * ============================================
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faEdit,
  faTrash,
  faGripVertical,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useKanbanColumns,
  useCreateKanbanColumn,
  useUpdateKanbanColumn,
  useDeleteKanbanColumn,
  useReorderKanbanColumns,
} from "@/hooks/useProjects";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useToast } from "@/store";
import { cn } from "@/lib/utils";
import type { KanbanColumn } from "@/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

interface KanbanColumnManagerProps {
  projectId: string;
}

interface SortableColumnItemProps {
  column: KanbanColumn;
  canManage: boolean;
  onEdit: (column: KanbanColumn) => void;
  onDelete: (column: KanbanColumn) => void;
}

const SortableColumnItem: React.FC<SortableColumnItemProps> = ({
  column,
  canManage,
  onEdit,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <FontAwesomeIcon
          icon={faGripVertical}
          className="w-4 h-4 text-muted-foreground"
        />
      </div>
      <div
        className="w-4 h-4 rounded"
        style={{ backgroundColor: column.color }}
      />
      <span className="flex-1 font-medium text-sm">{column.name}</span>
      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(column)}>
              <FontAwesomeIcon icon={faEdit} className="mr-2 w-4 h-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(column)}
              className="text-destructive focus:text-destructive"
            >
              <FontAwesomeIcon icon={faTrash} className="mr-2 w-4 h-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </motion.div>
  );
};

export const KanbanColumnManager: React.FC<KanbanColumnManagerProps> = ({
  projectId,
}) => {
  const { toast } = useToast();
  const permissions = useProjectPermissions(projectId);
  const { data: columns = [], isLoading } = useKanbanColumns(projectId);
  const createColumn = useCreateKanbanColumn();
  const updateColumn = useUpdateKanbanColumn();
  const deleteColumn = useDeleteKanbanColumn();
  const reorderColumns = useReorderKanbanColumns();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);
  const [columnToDelete, setColumnToDelete] = useState<KanbanColumn | null>(null);
  const [columnName, setColumnName] = useState("");
  const [columnColor, setColumnColor] = useState("#6366F1");
  const [localColumns, setLocalColumns] = useState<KanbanColumn[]>(columns);

  const canManage = permissions.canManageMembers;

  // Sync local columns with fetched columns
  React.useEffect(() => {
    if (columns.length > 0) {
      setLocalColumns(columns);
    }
  }, [columns]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = localColumns.findIndex((col) => col._id === active.id);
    const newIndex = localColumns.findIndex((col) => col._id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newColumns = arrayMove(localColumns, oldIndex, newIndex);
      const previousColumns = [...localColumns]; // Store previous state for rollback
      setLocalColumns(newColumns);

      // Update positions in backend
      const columnIds = newColumns.map((col) => col._id);
      reorderColumns.mutate(
        { projectId, columnIds },
        {
          onError: () => {
            // Rollback to previous state on error
            setLocalColumns(previousColumns);
          },
        }
      );
    }
  };

  const colorOptions = [
    "#6366F1", // Indigo
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#F59E0B", // Amber
    "#EF4444", // Red
    "#10B981", // Green
    "#3B82F6", // Blue
    "#F97316", // Orange
  ];

  const handleCreate = () => {
    if (!columnName.trim()) {
      toast.error("Column name required", "Please enter a name for the column");
      return;
    }

    createColumn.mutate(
      {
        projectId,
        data: {
          name: columnName.trim(),
          color: columnColor,
        },
      },
      {
        onSuccess: () => {
          setColumnName("");
          setColumnColor("#6366F1");
          setIsCreateDialogOpen(false);
          // Columns will be refetched automatically via query invalidation
        },
      }
    );
  };

  const handleUpdate = () => {
    if (!editingColumn || !columnName.trim()) {
      toast.error("Column name required", "Please enter a name for the column");
      return;
    }

    updateColumn.mutate(
      {
        projectId,
        columnId: editingColumn._id,
        data: {
          name: columnName.trim(),
          color: columnColor,
          position: editingColumn.position, // Preserve position when updating
        },
      },
      {
        onSuccess: () => {
          setEditingColumn(null);
          setColumnName("");
          setColumnColor("#6366F1");
        },
      }
    );
  };

  const handleDelete = () => {
    if (!columnToDelete) return;

    deleteColumn.mutate(
      {
        projectId,
        columnId: columnToDelete._id,
      },
      {
        onSuccess: () => {
          setColumnToDelete(null);
        },
      }
    );
  };

  const openEditDialog = (column: KanbanColumn) => {
    setEditingColumn(column);
    setColumnName(column.name);
    setColumnColor(column.color);
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading columns...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Kanban Columns</h3>
          <p className="text-xs text-muted-foreground">
            Customize columns for this project's Kanban board
          </p>
        </div>
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setColumnName("");
              setColumnColor("#6366F1");
              setIsCreateDialogOpen(true);
            }}
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2 h-3 w-3" />
            Add Column
          </Button>
        )}
      </div>

      {localColumns.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
          <p>No columns yet. Create your first column to get started.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localColumns.map((col) => col._id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {localColumns.map((column) => (
                <SortableColumnItem
                  key={column._id}
                  column={column}
                  canManage={canManage}
                  onEdit={openEditDialog}
                  onDelete={setColumnToDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Column</DialogTitle>
            <DialogDescription>
              Add a new column to your Kanban board
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="column-name">Column Name</Label>
              <Input
                id="column-name"
                placeholder="e.g., In Progress"
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreate();
                  }
                }}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setColumnColor(color)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      columnColor === color
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={createColumn.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingColumn} onOpenChange={(open) => !open && setEditingColumn(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Column</DialogTitle>
            <DialogDescription>
              Update column name and color
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-column-name">Column Name</Label>
              <Input
                id="edit-column-name"
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUpdate();
                  }
                }}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setColumnColor(color)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      columnColor === color
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingColumn(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} loading={updateColumn.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!columnToDelete}
        onOpenChange={(open) => !open && setColumnToDelete(null)}
        title="Delete Column"
        description={`Are you sure you want to delete "${columnToDelete?.name}"? Tasks in this column will be moved to the first column.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </>
  );
};
