import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { actionItemSchema, ActionItemInput } from "@/lib/validation";
import { axiosInstance } from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Edit2, Trash2 } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import { ActionItem } from "./types";

interface ActionItemsSectionProps {
  feedbackId: string;
  feedbackTitle?: string;
}

export default function ActionItemsSection({ feedbackId, feedbackTitle }: ActionItemsSectionProps) {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);

  const [editingActionItem, setEditingActionItem] = useState<ActionItem | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editOwner, setEditOwner] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPriority, setEditPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [editStatus, setEditStatus] = useState<"Open" | "In Progress" | "Blocked" | "Completed">("Open");
  const [deleteActionId, setDeleteActionId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<ActionItemInput>({
    resolver: zodResolver(actionItemSchema),
    defaultValues: {
      description: "",
      owner: "Unassigned",
      dueDate: new Date().toISOString().split("T")[0],
      priority: "Medium",
      status: "Open"
    },
  });

  useEffect(() => {
    loadActions();
  }, [feedbackId]);

  const loadActions = async () => {
    setLoadingActions(true);
    try {
      const res = await axiosInstance.get<ActionItem[]>(`/feedback/${feedbackId}/actions`);
      setActions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingActions(false);
    }
  };

  const onAddAction = async (data: ActionItemInput) => {
    try {
      await axiosInstance.post(`/feedback/${feedbackId}/actions`, data);
      reset();
      loadActions();
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (item: ActionItem) => {
    setEditingActionItem(item);
    setEditDesc(item.description);
    setEditOwner(item.owner);
    setEditDueDate(new Date(item.dueDate).toISOString().split("T")[0]);
    setEditPriority(item.priority);
    setEditStatus(item.status);
  };

  const saveEdit = async () => {
    if (!editingActionItem) return;
    try {
      await axiosInstance.put(`/actions/${editingActionItem.id}`, {
        description: editDesc,
        owner: editOwner,
        dueDate: editDueDate,
        priority: editPriority,
        status: editStatus
      });
      setEditingActionItem(null);
      loadActions();
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = async () => {
    if (!deleteActionId) return;
    try {
      await axiosInstance.delete(`/actions/${deleteActionId}`);
      setDeleteActionId(null);
      loadActions();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Action Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingActions ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : actions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div dangerouslySetInnerHTML={{ __html: item.description }} />
                    </TableCell>
                    <TableCell>{item.owner}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(item.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.priority === "High" ? "destructive" : "secondary"}>
                        {item.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "Completed"
                            ? "default"
                            : item.status === "Blocked"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => startEdit(item)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive animate-none"
                          onClick={() => setDeleteActionId(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground italic">No action items yet.</p>
          )}

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-3">Add Action Item</h4>
            <form onSubmit={handleSubmit(onAddAction)} className="space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 space-y-2">
                  <Label className="text-xs">Description</Label>
                  <RichTextEditor
                    value={watch("description") || ""}
                    onChange={(val) => setValue("description", val)}
                    height={120}
                  />
                  {errors.description && (
                    <p className="text-xs text-destructive">{errors.description.message}</p>
                  )}
                </div>
                <div className="lg:col-span-2 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Owner</Label>
                      <Input {...register("owner")} placeholder="Assignee" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Due Date</Label>
                      <Input type="date" {...register("dueDate")} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Priority</Label>
                      <select
                        {...register("priority")}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status</Label>
                      <select
                        {...register("status")}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Blocked">Blocked</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button type="submit" disabled={isSubmitting} size="sm">
                      {isSubmitting ? "Adding..." : "Add Action"}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Delete Action Dialog */}
      <Dialog open={!!deleteActionId} onOpenChange={(open) => !open && setDeleteActionId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Action Item</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteActionId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Action Dialog */}
      <Dialog open={!!editingActionItem} onOpenChange={(open) => !open && setEditingActionItem(null)}>
        <DialogContent className="max-w-full sm:max-w-4xl lg:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Edit Action Item</DialogTitle>
            <DialogDescription>Modify follow-up action item parameters and execution detail.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 py-4">
            {/* Left Column: Context & Task details (takes 3/5 cols) */}
            <div className="space-y-4 md:col-span-3">
              {feedbackTitle && (
                <div className="bg-muted/50 p-3.5 rounded-lg border border-border/60 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Source Context
                  </span>
                  <h4 className="text-xs font-semibold text-foreground leading-normal">{feedbackTitle}</h4>
                </div>
              )}

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
                  <Select value={editPriority} onValueChange={(v) => setEditPriority(v as any)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as any)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
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
            <Button variant="outline" onClick={() => setEditingActionItem(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
