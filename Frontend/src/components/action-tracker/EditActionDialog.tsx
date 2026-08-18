import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RichTextEditor from "@/components/RichTextEditor";
import { GlobalActionItem } from "./types";

interface EditActionDialogProps {
  editingItem: GlobalActionItem | null;
  onClose: () => void;
  onSave: (id: string, data: {
    description: string;
    owner: string;
    dueDate: string;
    priority: "Low" | "Medium" | "High";
    status: "Open" | "In Progress" | "Blocked" | "Completed";
  }) => Promise<void>;
}

export default function EditActionDialog({ editingItem, onClose, onSave }: EditActionDialogProps) {
  const [editDesc, setEditDesc] = useState("");
  const [editOwner, setEditOwner] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPriority, setEditPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [editStatus, setEditStatus] = useState<"Open" | "In Progress" | "Blocked" | "Completed">("Open");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setEditDesc(editingItem.description);
      setEditOwner(editingItem.owner);
      setEditDueDate(new Date(editingItem.dueDate).toISOString().split("T")[0]);
      setEditPriority(editingItem.priority);
      setEditStatus(editingItem.status);
    }
  }, [editingItem]);

  const handleSave = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      await onSave(editingItem.id, {
        description: editDesc,
        owner: editOwner,
        dueDate: editDueDate,
        priority: editPriority,
        status: editStatus,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!editingItem} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-full sm:max-w-4xl lg:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Edit Action Item</DialogTitle>
          <DialogDescription>Modify follow-up action item parameters and execution detail.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 py-4">
          {/* Left Column: Context & Task details (takes 3/5 cols) */}
          <div className="space-y-4 md:col-span-3">
            <div className="bg-muted/50 p-3.5 rounded-lg border border-border/60 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Source Context</span>
              <h4 className="text-xs font-semibold text-foreground leading-normal">{editingItem?.feedbackTitle}</h4>
              {editingItem && (
                <div className="pt-2">
                  <Link
                    href={`/chat/${editingItem.feedbackId}`}
                    className="text-[10px] text-primary hover:underline font-semibold"
                  >
                    View Source Feedback Details →
                  </Link>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc">Action Description</Label>
              <RichTextEditor
                value={editDesc}
                onChange={(val) => setEditDesc(val)}
                height={180}
              />
            </div>
          </div>

          {/* Right Column: Execution Metadata (takes 2/5 cols) */}
          <div className="space-y-4 md:col-span-2">
            <div className="space-y-1.5">
              <Label htmlFor="owner">Assignee / Owner</Label>
              <Input
                id="owner"
                value={editOwner}
                onChange={(e) => setEditOwner(e.target.value)}
                placeholder="Assignee name"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={editPriority} onValueChange={(v) => { if (v) setEditPriority(v as any); }}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={(v) => { if (v) setEditStatus(v as any); }}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Blocked">Blocked</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
