"use client";

import React, { useState, useEffect } from "react";
import { axiosInstance } from "@/lib/axios";
import { Card, CardContent } from "@/components/ui/card";
import ActionsHeader from "@/components/action-tracker/ActionsHeader";
import ActionsTableView from "@/components/action-tracker/ActionsTableView";
import ActionsKanbanView from "@/components/action-tracker/ActionsKanbanView";
import EditActionDialog from "@/components/action-tracker/EditActionDialog";
import DeleteActionDialog from "@/components/action-tracker/DeleteActionDialog";
import { GlobalActionItem } from "@/components/action-tracker/types";

export default function ActionsTrackerPage() {
  const [actions, setActions] = useState<GlobalActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  // Dialog states
  const [editingItem, setEditingItem] = useState<GlobalActionItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadActions();
  }, []);

  const loadActions = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get<GlobalActionItem[]>("/actions");
      setActions(res.data);
    } catch (err) {
      console.error("Failed to load actions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (
    id: string,
    data: {
      description: string;
      owner: string;
      dueDate: string;
      priority: "Low" | "Medium" | "High";
      status: "Open" | "In Progress" | "Blocked" | "Completed";
    }
  ) => {
    try {
      await axiosInstance.put(`/actions/${id}`, data);
      setEditingItem(null);
      loadActions();
    } catch (err) {
      console.error("Failed to update:", err);
    }
  };

  const handleUpdateStatus = async (
    item: GlobalActionItem,
    newStatus: "Open" | "In Progress" | "Blocked" | "Completed"
  ) => {
    try {
      await axiosInstance.put(`/actions/${item.id}`, {
        description: item.description,
        owner: item.owner,
        dueDate: new Date(item.dueDate).toISOString().split("T")[0],
        priority: item.priority,
        status: newStatus,
      });
      loadActions();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await axiosInstance.delete(`/actions/${deleteId}`);
      setDeleteId(null);
      loadActions();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] sm:h-[calc(100vh-6.5rem)] lg:h-[calc(100vh-7.5rem)] overflow-hidden w-full space-y-4">
      <ActionsHeader viewMode={viewMode} setViewMode={setViewMode} />

      {loading ? (
        <div className="flex-1 space-y-4 p-5 border border-border/80 bg-card rounded-xl">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-0">
              <div className="h-4 bg-muted shimmer rounded-sm w-1/3" />
              <div className="h-4 bg-muted shimmer rounded-sm w-1/6" />
              <div className="h-4 bg-muted shimmer rounded-sm w-1/8" />
              <div className="h-5 bg-muted shimmer rounded-full w-16" />
              <div className="h-5 bg-muted shimmer rounded-full w-12" />
            </div>
          ))}
        </div>
      ) : actions.length === 0 ? (
        <Card className="flex-1 text-center p-12 flex flex-col justify-center">
          <CardContent className="space-y-2">
            <p className="text-muted-foreground text-sm font-medium">No action items found.</p>
            <p className="text-xs text-muted-foreground/80">
              Go to a feedback details page to generate or add action items.
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        <ActionsTableView
          actions={actions}
          onEdit={setEditingItem}
          onDelete={setDeleteId}
        />
      ) : (
        <ActionsKanbanView
          actions={actions}
          onEdit={setEditingItem}
          onDelete={setDeleteId}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* Edit Action Modal */}
      <EditActionDialog
        editingItem={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEdit}
      />

      {/* Delete Action Dialog */}
      <DeleteActionDialog
        deleteId={deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
